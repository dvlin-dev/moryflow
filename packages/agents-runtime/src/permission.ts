/**
 * [PROVIDES]: Permission 规则评估与工具权限包装
 * [DEPENDS]: @openai/agents-core, agents-adapter
 * [POS]: Agent Runtime Permission 控制面基础能力
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { FunctionTool, RunContext, Tool } from '@openai/agents-core';
import type { PathUtils } from '@anyhunt/agents-adapter';
import type { AgentContext } from './types';

export type PermissionDomain = 'read' | 'edit' | 'bash' | 'web_fetch' | 'web_search' | 'mcp';

export type PermissionDecision = 'allow' | 'deny' | 'ask';

export type PermissionRule = {
  domain: PermissionDomain;
  pattern: string;
  decision: PermissionDecision;
};

export type PermissionTargets = {
  domain: PermissionDomain;
  targets: string[];
};

export type PermissionDecisionInfo = {
  toolName: string;
  callId?: string;
  domain: PermissionDomain;
  targets: string[];
  decision: PermissionDecision;
  rule?: PermissionRule;
  rulePattern?: string;
};

export type PermissionAuditEvent = {
  eventId: string;
  sessionId: string;
  mode: 'agent' | 'full_access';
  decision: PermissionDecision;
  permissionDomain: PermissionDomain;
  targets: string[];
  rulePattern?: string;
  timestamp: number;
};

export type PermissionDeniedOutput = {
  kind: 'permission_denied';
  message: string;
  domain: PermissionDomain;
  targets: string[];
};

export type PermissionCheckInput = {
  toolName: string;
  input: unknown;
  callId?: string;
  runContext?: RunContext<AgentContext>;
  mcpServerId?: string;
};

export type PermissionCheckResult = PermissionDecisionInfo | null;

export type PermissionCheck = (
  input: PermissionCheckInput
) => Promise<PermissionCheckResult> | PermissionCheckResult;

export type PermissionWrapHandlers = {
  onDecision?: (info: PermissionDecisionInfo) => void;
  onClearDecision?: (callId: string) => void;
  buildDeniedOutput?: (info: PermissionDecisionInfo) => unknown;
};

const TOOL_PERMISSION_WRAPPED = Symbol('tool-permission');

const PERMISSION_DENIED_MESSAGE = 'Permission denied by policy.';

const SENSITIVE_FILE_PATTERNS = ['**/*.env*', '**/*.pem', '**/*.key'];

const getMcpServerIdFromTool = (tool: Tool<AgentContext>): string | undefined => {
  return (tool as { __mcpServerId?: string }).__mcpServerId;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isPermissionRule = (value: unknown): value is PermissionRule => {
  if (!isRecord(value)) return false;
  if (typeof value.domain !== 'string' || typeof value.pattern !== 'string') return false;
  if (!['allow', 'deny', 'ask'].includes(String(value.decision))) return false;
  return true;
};

export const isPermissionDeniedOutput = (value: unknown): value is PermissionDeniedOutput => {
  if (!isRecord(value)) return false;
  return value.kind === 'permission_denied' && typeof value.message === 'string';
};

export const createPermissionDeniedOutput = (
  info: PermissionDecisionInfo
): PermissionDeniedOutput => ({
  kind: 'permission_denied',
  message: PERMISSION_DENIED_MESSAGE,
  domain: info.domain,
  targets: info.targets,
});

const globPatternToRegex = (pattern: string): RegExp => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const withGlob =
    escaped.replace(/\*\*/g, '<<<GLOBSTAR>>>').replace(/\*/g, '[^/]*').replace(/\?/g, '.') ?? '';
  const finalPattern = withGlob.replace(/<<<GLOBSTAR>>>/g, '.*');
  return new RegExp(`^${finalPattern}$`);
};

const matchPattern = (pattern: string, target: string): boolean => {
  if (!pattern) return false;
  if (pattern.startsWith('regex:')) {
    const raw = pattern.slice('regex:'.length);
    try {
      return new RegExp(raw).test(target);
    } catch {
      return false;
    }
  }
  return globPatternToRegex(pattern).test(target);
};

const normalizeSlash = (value: string, pathUtils: PathUtils): string => {
  return value.split(pathUtils.sep).join('/');
};

const isWithinRoot = (root: string, target: string, pathUtils: PathUtils): boolean => {
  const relative = pathUtils.relative(root, target);
  if (relative === '') return true;
  return !relative.startsWith('..') && !pathUtils.isAbsolute(relative);
};

const normalizeRelative = (value: string): string => {
  if (!value || value === '.') return '';
  return value.replace(/^\.?\//, '');
};

const buildFileTarget = (
  targetPath: string,
  runContext: RunContext<AgentContext> | undefined,
  pathUtils: PathUtils
): string => {
  const vaultRoot = runContext?.context?.vaultRoot;
  if (pathUtils.isAbsolute(targetPath)) {
    const absolute = normalizeSlash(pathUtils.resolve(targetPath), pathUtils);
    return `fs:${absolute}`;
  }
  if (vaultRoot) {
    const absolute = pathUtils.resolve(vaultRoot, targetPath);
    if (isWithinRoot(vaultRoot, absolute, pathUtils)) {
      const relative = normalizeRelative(
        normalizeSlash(pathUtils.relative(vaultRoot, absolute), pathUtils)
      );
      return `vault:/${relative}`;
    }
    const fallback = normalizeSlash(absolute, pathUtils);
    return `fs:${fallback}`;
  }
  return `fs:${normalizeSlash(targetPath, pathUtils)}`;
};

const buildGlobTarget = (pattern: string): string => {
  const normalized = pattern.replace(/^\/+/, '').replace(/\\/g, '/');
  return `vault:${normalized}`;
};

export const buildDefaultPermissionRules = (input?: {
  mcpServerIds?: string[];
}): PermissionRule[] => {
  const rules: PermissionRule[] = [
    { domain: 'read', pattern: 'vault:**', decision: 'allow' },
    { domain: 'read', pattern: 'fs:**', decision: 'ask' },
    ...SENSITIVE_FILE_PATTERNS.map((pattern) => ({
      domain: 'read' as const,
      pattern: `vault:${pattern}`,
      decision: 'ask' as const,
    })),
    ...SENSITIVE_FILE_PATTERNS.map((pattern) => ({
      domain: 'read' as const,
      pattern: `fs:${pattern}`,
      decision: 'ask' as const,
    })),
    { domain: 'edit', pattern: 'vault:**', decision: 'allow' },
    { domain: 'edit', pattern: 'fs:**', decision: 'deny' },
    { domain: 'bash', pattern: 'shell:*', decision: 'ask' },
    { domain: 'web_fetch', pattern: 'url:**', decision: 'allow' },
    { domain: 'web_search', pattern: 'query:**', decision: 'allow' },
  ];

  const mcpServerIds = input?.mcpServerIds ?? [];
  for (const serverId of mcpServerIds) {
    if (!serverId) continue;
    rules.push({ domain: 'mcp', pattern: `mcp:${serverId}/**`, decision: 'allow' });
  }
  rules.push({ domain: 'mcp', pattern: 'mcp:**', decision: 'ask' });

  return rules;
};

export const resolveToolPermissionTargets = ({
  toolName,
  input,
  runContext,
  mcpServerId,
  pathUtils,
}: PermissionCheckInput & { pathUtils: PathUtils }): PermissionTargets | null => {
  if (!isRecord(input)) {
    if (toolName === 'bash' && typeof input === 'string') {
      return { domain: 'bash', targets: [`shell:${input}`] };
    }
    return null;
  }

  const getString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value : undefined;

  switch (toolName) {
    case 'read':
    case 'search_in_file': {
      const pathValue = getString(input.path);
      if (!pathValue) return null;
      return {
        domain: 'read',
        targets: [buildFileTarget(pathValue, runContext, pathUtils)],
      };
    }
    case 'ls': {
      const pathValue = getString(input.path) ?? '.';
      return {
        domain: 'read',
        targets: [buildFileTarget(pathValue, runContext, pathUtils)],
      };
    }
    case 'glob': {
      const pattern = getString(input.pattern);
      if (!pattern) return null;
      return { domain: 'read', targets: [buildGlobTarget(pattern)] };
    }
    case 'grep': {
      const glob = input.glob;
      const patterns = Array.isArray(glob)
        ? glob.filter((item) => typeof item === 'string' && item.trim().length > 0)
        : typeof glob === 'string' && glob.trim().length > 0
          ? [glob.trim()]
          : ['**/*.md'];
      return { domain: 'read', targets: patterns.map(buildGlobTarget) };
    }
    case 'write':
    case 'edit':
    case 'delete': {
      const pathValue = getString(input.path);
      if (!pathValue) return null;
      return {
        domain: 'edit',
        targets: [buildFileTarget(pathValue, runContext, pathUtils)],
      };
    }
    case 'move': {
      const fromPath = getString(input.from);
      const toPath = getString(input.to);
      if (!fromPath && !toPath) return null;
      const targets = [
        ...(fromPath ? [buildFileTarget(fromPath, runContext, pathUtils)] : []),
        ...(toPath ? [buildFileTarget(toPath, runContext, pathUtils)] : []),
      ];
      return { domain: 'edit', targets };
    }
    case 'bash': {
      const command = getString(input.command) ?? '';
      return { domain: 'bash', targets: [`shell:${command}`] };
    }
    case 'web_fetch': {
      const url = getString(input.url);
      if (!url) return null;
      return { domain: 'web_fetch', targets: [`url:${url}`] };
    }
    case 'web_search': {
      const query = getString(input.query);
      if (!query) return null;
      return { domain: 'web_search', targets: [`query:${query}`] };
    }
    default: {
      if (mcpServerId) {
        return {
          domain: 'mcp',
          targets: [`mcp:${mcpServerId ?? 'unknown'}/${toolName}`],
        };
      }
      return null;
    }
  }
};

export const evaluatePermissionDecision = (input: {
  domain: PermissionDomain;
  targets: string[];
  rules: PermissionRule[];
  fallbackDecision?: PermissionDecision;
}): Omit<PermissionDecisionInfo, 'toolName' | 'callId'> => {
  const { domain, targets, rules, fallbackDecision = 'allow' } = input;
  const relevantRules = rules.filter((rule) => rule.domain === domain);
  const decisions = targets.map((target) => {
    let matchedRule: PermissionRule | undefined;
    for (const rule of relevantRules) {
      if (matchPattern(rule.pattern, target)) {
        matchedRule = rule;
      }
    }
    const decision = matchedRule?.decision ?? fallbackDecision;
    return { decision, rule: matchedRule, target };
  });

  const priority = (decision: PermissionDecision) =>
    decision === 'deny' ? 3 : decision === 'ask' ? 2 : 1;
  let winner = decisions[decisions.length - 1];
  for (const item of decisions) {
    if (!winner || priority(item.decision) > priority(winner.decision)) {
      winner = item;
    } else if (priority(item.decision) === priority(winner.decision)) {
      winner = item;
    }
  }

  return {
    domain,
    targets,
    decision: winner?.decision ?? fallbackDecision,
    rule: winner?.rule,
    rulePattern: winner?.rule?.pattern,
  };
};

export const wrapToolWithPermission = (
  tool: Tool<AgentContext>,
  check: PermissionCheck,
  handlers: PermissionWrapHandlers = {}
): Tool<AgentContext> => {
  if ((tool as Tool<AgentContext> & Record<symbol, boolean>)[TOOL_PERMISSION_WRAPPED]) {
    return tool;
  }

  if (tool.type !== 'function') {
    throw new Error(
      `[permission] Unsupported tool type: ${tool.type}. Only function tools can be wrapped.`
    );
  }

  const decisionCache = new Map<string, PermissionDecisionInfo>();
  const baseNeedsApproval = tool.needsApproval.bind(tool);
  const buildDeniedOutput = handlers.buildDeniedOutput ?? createPermissionDeniedOutput;

  const resolveDecision = async (runContext: RunContext, input: unknown, callId?: string) => {
    if (callId && decisionCache.has(callId)) {
      return decisionCache.get(callId) ?? null;
    }
    const info = await check({
      toolName: tool.name,
      input,
      callId,
      runContext: runContext as RunContext<AgentContext>,
      mcpServerId: getMcpServerIdFromTool(tool),
    });
    if (info && callId) {
      decisionCache.set(callId, info);
    }
    if (info) {
      handlers.onDecision?.(info);
    }
    return info;
  };

  const wrapped: FunctionTool<AgentContext> = {
    ...tool,
    async needsApproval(runContext, input, callId) {
      const info = await resolveDecision(runContext, input, callId);
      if (info?.decision === 'deny') {
        return false;
      }
      const baseDecision = await baseNeedsApproval(runContext, input, callId);
      if (info?.decision === 'ask') {
        return true;
      }
      return baseDecision;
    },
    async invoke(runContext, input, details) {
      const callId = details?.toolCall?.callId;
      const info = callId ? decisionCache.get(callId) : null;
      try {
        if (info?.decision === 'deny') {
          return buildDeniedOutput(info);
        }
        return await tool.invoke(runContext, input, details);
      } finally {
        if (callId) {
          decisionCache.delete(callId);
          handlers.onClearDecision?.(callId);
        }
      }
    },
  };

  Object.defineProperty(wrapped, TOOL_PERMISSION_WRAPPED, {
    value: true,
    enumerable: false,
  });

  return wrapped;
};

export const wrapToolsWithPermission = (
  tools: Tool<AgentContext>[],
  check: PermissionCheck,
  handlers?: PermissionWrapHandlers
): Tool<AgentContext>[] => tools.map((tool) => wrapToolWithPermission(tool, check, handlers));
