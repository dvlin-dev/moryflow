/**
 * [INPUT]: 工具审批请求（RunToolApprovalItem）
 * [OUTPUT]: 审批挂起/恢复与持久化记录
 * [POS]: Mobile Chat 运行时的权限审批协调器
 * [UPDATE]: 2026-03-03 - approveToolRequest 改为幂等结构化状态返回，重复/过期审批不再抛异常
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { Agent, RunState, RunToolApprovalItem } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import { getPermissionRuntime } from '@/lib/agent-runtime/permission-runtime';
import { getDoomLoopRuntime } from '@/lib/agent-runtime/doom-loop-runtime';
import { generateUUID } from '@/lib/utils/uuid';

export type ApprovalGate = {
  chatId: string;
  state: RunState<AgentContext, Agent<AgentContext>>;
  pendingIds: Set<string>;
  resolve: (() => void) | null;
  promise: Promise<void>;
};

type ApprovalEntry = {
  approvalId: string;
  toolCallId: string;
  item: RunToolApprovalItem;
  gate: ApprovalGate;
};

export type ApproveToolRequestResult =
  | {
      status: 'approved';
      remember: 'once' | 'always';
    }
  | {
      status: 'already_processed';
      reason: 'missing' | 'expired' | 'processing';
    };

const approvalEntries = new Map<string, ApprovalEntry>();
const approvalGates = new Map<string, ApprovalGate>();
const processingApprovalIds = new Set<string>();

export const createApprovalGate = (input: {
  chatId: string;
  state: RunState<AgentContext, Agent<AgentContext>>;
}): ApprovalGate => {
  const { chatId, state } = input;
  const existing = approvalGates.get(chatId);
  if (existing) {
    existing.state = state;
    existing.pendingIds.clear();
    existing.resolve = null;
    existing.promise = new Promise((resolve) => {
      existing.resolve = resolve;
    });
    return existing;
  }

  let resolveRef: (() => void) | null = null;
  const gate: ApprovalGate = {
    chatId,
    state,
    pendingIds: new Set(),
    resolve: null,
    promise: new Promise((resolve) => {
      resolveRef = resolve;
    }),
  };
  gate.resolve = resolveRef;
  approvalGates.set(chatId, gate);
  return gate;
};

export const registerApprovalRequest = (
  gate: ApprovalGate,
  input: {
    toolCallId: string;
    item: RunToolApprovalItem;
  }
): string => {
  const approvalId = generateUUID();
  const entry: ApprovalEntry = {
    approvalId,
    toolCallId: input.toolCallId,
    item: input.item,
    gate,
  };
  gate.pendingIds.add(approvalId);
  approvalEntries.set(approvalId, entry);
  return approvalId;
};

export const hasPendingApprovals = (gate: ApprovalGate): boolean => gate.pendingIds.size > 0;

export const waitForApprovals = async (gate: ApprovalGate): Promise<void> => {
  if (gate.pendingIds.size === 0) return;
  await gate.promise;
};

export const approveToolRequest = async (input: {
  approvalId: string;
  remember: 'once' | 'always';
}): Promise<ApproveToolRequestResult> => {
  const entry = approvalEntries.get(input.approvalId);
  if (!entry) {
    return { status: 'already_processed', reason: 'missing' };
  }
  if (processingApprovalIds.has(input.approvalId)) {
    return { status: 'already_processed', reason: 'processing' };
  }
  if (
    !entry.gate.pendingIds.has(entry.approvalId) ||
    approvalEntries.get(entry.approvalId) !== entry
  ) {
    return { status: 'already_processed', reason: 'expired' };
  }
  processingApprovalIds.add(input.approvalId);

  try {
    if (
      !entry.gate.pendingIds.has(entry.approvalId) ||
      approvalEntries.get(entry.approvalId) !== entry
    ) {
      return { status: 'already_processed', reason: 'expired' };
    }

    entry.gate.state.approve(entry.item);

    const doomLoopRuntime = getDoomLoopRuntime();
    doomLoopRuntime?.approve(entry.toolCallId, input.remember);

    const permissionRuntime = getPermissionRuntime();
    if (permissionRuntime) {
      const record = permissionRuntime.getDecision(entry.toolCallId);
      if (record?.decision === 'ask') {
        try {
          if (input.remember === 'always') {
            await permissionRuntime.persistAlwaysRules(record);
          }
          await permissionRuntime.recordDecision(record, 'allow');
        } catch (error) {
          console.error('[approval-store] failed to persist permission decision', error);
        }
      }
    }

    entry.gate.pendingIds.delete(entry.approvalId);
    approvalEntries.delete(entry.approvalId);
    if (entry.gate.pendingIds.size === 0) {
      entry.gate.resolve?.();
    }
    return { status: 'approved', remember: input.remember };
  } finally {
    processingApprovalIds.delete(input.approvalId);
  }
};

export const clearApprovalGate = (chatId: string): void => {
  const gate = approvalGates.get(chatId);
  if (!gate) return;
  const doomLoopRuntime = getDoomLoopRuntime();
  const permissionRuntime = getPermissionRuntime();
  for (const approvalId of gate.pendingIds) {
    processingApprovalIds.delete(approvalId);
    const entry = approvalEntries.get(approvalId);
    if (entry) {
      doomLoopRuntime?.clear(entry.toolCallId);
      permissionRuntime?.clearDecision(entry.toolCallId);
    }
    approvalEntries.delete(approvalId);
  }
  gate.pendingIds.clear();
  gate.resolve?.();
  approvalGates.delete(chatId);
};
