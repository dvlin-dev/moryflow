/**
 * [PROVIDES]: Doom Loop 守卫与工具包装（重复工具检测、审批触发、冷却与会话级记忆）
 * [DEPENDS]: @openai/agents-core
 * [POS]: Agent Runtime Doom Loop 控制面核心逻辑
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { FunctionTool, RunContext, Tool } from '@openai/agents-core';

import type { AgentContext } from './types';

export type DoomLoopReason =
  | 'same_tool'
  | 'max_tool_calls'
  | 'max_attempts'
  | 'missing_call_id'
  | 'no_ui';

export type DoomLoopAction = 'allow' | 'ask' | 'stop';

export type DoomLoopConfig = {
  /** 单次 run 内允许继续的最大次数 */
  maxAttempts: number;
  /** 单次 run 工具调用上限 */
  maxToolCalls: number;
  /** 相同工具 + 相同参数连续次数 */
  sameToolThreshold: number;
  /** 参数哈希最大字节数（超限仅按 toolName 计数） */
  maxSignatureBytes: number;
  /** 审批通过后的冷却调用数 */
  cooldownToolCalls: number;
};

export type DoomLoopDecision = {
  action: DoomLoopAction;
  reason?: DoomLoopReason;
};

export type DoomLoopApprovalInfo = {
  callId: string;
  sessionId: string;
  reason: DoomLoopReason;
  toolName: string;
  totalToolCalls: number;
  consecutiveSame: number;
};

export type DoomLoopCheckInput = {
  runContext: RunContext<AgentContext>;
  toolName: string;
  input: unknown;
  callId?: string;
};

export type DoomLoopGuard = {
  check: (input: DoomLoopCheckInput) => DoomLoopDecision;
  getPendingApproval: (callId: string) => DoomLoopApprovalInfo | undefined;
  approve: (callId: string, remember: 'once' | 'always') => void;
  clear: (callId: string) => void;
};

export const DEFAULT_DOOM_LOOP_CONFIG: DoomLoopConfig = {
  maxAttempts: 3,
  maxToolCalls: 60,
  sameToolThreshold: 5,
  maxSignatureBytes: 8 * 1024,
  cooldownToolCalls: 3,
};

export class DoomLoopError extends Error {
  readonly reason: DoomLoopReason;
  readonly totalToolCalls?: number;
  readonly consecutiveSame?: number;

  constructor(
    reason: DoomLoopReason,
    details?: { totalToolCalls?: number; consecutiveSame?: number }
  ) {
    super('Tool loop detected. Please refine your request and try again.');
    this.name = 'DoomLoopError';
    this.reason = reason;
    this.totalToolCalls = details?.totalToolCalls;
    this.consecutiveSame = details?.consecutiveSame;
  }
}

const TOOL_DOOM_LOOP_WRAPPED = Symbol('tool-doom-loop');

type DoomLoopRunState = {
  totalToolCalls: number;
  consecutiveSame: number;
  lastSignature: string | null;
  attempts: number;
  cooldownRemaining: number;
};

type DoomLoopPendingApproval = DoomLoopApprovalInfo & {
  runContext: RunContext<AgentContext>;
};

const encodeByteLength = (value: string): number => {
  return encodeURIComponent(value).replace(/%[A-F\d]{2}/gi, '_').length;
};

const stableStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();

  const normalize = (input: unknown): unknown => {
    if (typeof input === 'bigint') {
      return input.toString();
    }
    if (input instanceof Error) {
      return {
        name: input.name,
        message: input.message,
        stack: input.stack,
      };
    }
    if (typeof input !== 'object' || input === null) {
      return input;
    }
    if (seen.has(input)) {
      return '[Circular]';
    }
    seen.add(input);

    if (Array.isArray(input)) {
      return input.map((item) => normalize(item));
    }

    const record = input as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      normalized[key] = normalize(record[key]);
    }
    return normalized;
  };

  try {
    const json = JSON.stringify(normalize(value));
    return typeof json === 'string' ? json : String(value ?? '');
  } catch {
    return String(value ?? '');
  }
};

const buildSignature = (toolName: string, input: unknown, maxBytes: number): string => {
  const raw = typeof input === 'string' ? input : stableStringify(input);
  if (encodeByteLength(raw) > maxBytes) {
    return toolName;
  }
  return `${toolName}:${raw}`;
};

const createRunState = (): DoomLoopRunState => ({
  totalToolCalls: 0,
  consecutiveSame: 0,
  lastSignature: null,
  attempts: 0,
  cooldownRemaining: 0,
});

const resetRunState = (state: DoomLoopRunState): void => {
  state.totalToolCalls = 0;
  state.consecutiveSame = 0;
  state.lastSignature = null;
};

export const createDoomLoopGuard = (input?: {
  config?: Partial<DoomLoopConfig>;
  uiAvailable?: boolean;
  getSessionId?: (runContext: RunContext<AgentContext>) => string;
  shouldSkip?: (input: DoomLoopCheckInput) => boolean;
}): DoomLoopGuard => {
  const config: DoomLoopConfig = { ...DEFAULT_DOOM_LOOP_CONFIG, ...(input?.config ?? {}) };
  const uiAvailable = input?.uiAvailable ?? true;
  const shouldSkip = input?.shouldSkip;
  const resolveSessionId =
    input?.getSessionId ??
    ((runContext: RunContext<AgentContext>) => runContext?.context?.chatId ?? 'unknown');

  const stateByRun = new WeakMap<RunContext<AgentContext>, DoomLoopRunState>();
  const pendingApprovals = new Map<string, DoomLoopPendingApproval>();
  const sessionAlways = new Set<string>();

  const getState = (runContext: RunContext<AgentContext>): DoomLoopRunState => {
    const existing = stateByRun.get(runContext);
    if (existing) return existing;
    const created = createRunState();
    stateByRun.set(runContext, created);
    return created;
  };

  const applyApproval = (
    state: DoomLoopRunState,
    sessionId: string,
    remember: 'once' | 'always'
  ) => {
    state.attempts += 1;
    resetRunState(state);
    state.cooldownRemaining = config.cooldownToolCalls;
    if (remember === 'always') {
      sessionAlways.add(sessionId);
    }
  };

  const check: DoomLoopGuard['check'] = ({ runContext, toolName, input: args, callId }) => {
    if (shouldSkip?.({ runContext, toolName, input: args, callId })) {
      return { action: 'allow' };
    }
    const state = getState(runContext);
    const sessionId = resolveSessionId(runContext);

    state.totalToolCalls += 1;

    const signature = buildSignature(toolName, args, config.maxSignatureBytes);
    if (signature === state.lastSignature) {
      state.consecutiveSame += 1;
    } else {
      state.consecutiveSame = 1;
    }
    state.lastSignature = signature;

    if (state.cooldownRemaining > 0) {
      state.cooldownRemaining -= 1;
      state.consecutiveSame = 1;
      return { action: 'allow' as const };
    }

    let reason: DoomLoopReason | null = null;
    if (state.consecutiveSame >= config.sameToolThreshold) {
      reason = 'same_tool';
    } else if (state.totalToolCalls >= config.maxToolCalls) {
      reason = 'max_tool_calls';
    }

    if (!reason) {
      return { action: 'allow' as const };
    }
    const activeReason = reason as DoomLoopReason;

    if (state.attempts >= config.maxAttempts) {
      return { action: 'stop' as const, reason: 'max_attempts' };
    }

    if (sessionAlways.has(sessionId)) {
      applyApproval(state, sessionId, 'always');
      return { action: 'allow' as const, reason: activeReason };
    }

    if (!uiAvailable) {
      return { action: 'stop' as const, reason: 'no_ui' };
    }

    if (!callId) {
      return { action: 'stop' as const, reason: 'missing_call_id' };
    }

    pendingApprovals.set(callId, {
      callId,
      sessionId,
      reason: activeReason,
      toolName,
      totalToolCalls: state.totalToolCalls,
      consecutiveSame: state.consecutiveSame,
      runContext,
    });

    return { action: 'ask' as const, reason: activeReason };
  };

  const approve = (callId: string, remember: 'once' | 'always') => {
    const pending = pendingApprovals.get(callId);
    if (!pending) return;
    const state = getState(pending.runContext);
    applyApproval(state, pending.sessionId, remember);
    pendingApprovals.delete(callId);
  };

  const clear = (callId: string) => {
    pendingApprovals.delete(callId);
  };

  return {
    check,
    getPendingApproval: (callId: string) => {
      const pending = pendingApprovals.get(callId);
      if (!pending) return undefined;
      const { runContext: _runContext, ...info } = pending;
      return info;
    },
    approve,
    clear,
  };
};

export const wrapToolWithDoomLoop = (
  tool: Tool<AgentContext>,
  guard: DoomLoopGuard
): Tool<AgentContext> => {
  if ((tool as Tool<AgentContext> & Record<symbol, boolean>)[TOOL_DOOM_LOOP_WRAPPED]) {
    return tool;
  }

  if (tool.type !== 'function') {
    throw new Error(`[doom-loop] Unsupported tool type: ${tool.type}.`);
  }

  const baseNeedsApproval =
    typeof tool.needsApproval === 'function'
      ? tool.needsApproval
      : async () => Boolean(tool.needsApproval);

  const wrapped: FunctionTool<AgentContext> = {
    ...tool,
    async needsApproval(runContext, input, callId) {
      const baseDecision = await baseNeedsApproval(runContext, input, callId);
      const decision = guard.check({
        runContext: runContext as RunContext<AgentContext>,
        toolName: tool.name,
        input,
        callId,
      });
      if (decision.action === 'stop') {
        throw new DoomLoopError(decision.reason ?? 'max_attempts');
      }
      if (decision.action === 'ask') {
        return true;
      }
      return baseDecision;
    },
  };

  Object.defineProperty(wrapped, TOOL_DOOM_LOOP_WRAPPED, {
    value: true,
    enumerable: false,
  });

  return wrapped;
};

export const wrapToolsWithDoomLoop = (
  tools: Tool<AgentContext>[],
  guard: DoomLoopGuard
): Tool<AgentContext>[] => tools.map((tool) => wrapToolWithDoomLoop(tool, guard));
