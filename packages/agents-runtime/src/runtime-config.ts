/**
 * [PROVIDES]: Runtime JSONC 配置解析与合并
 * [DEPENDS]: jsonc, agents-runtime/hooks
 * [POS]: 控制面配置加载（用户级 JSONC + 内联覆盖）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { CompactionConfig } from './compaction';
import type { DoomLoopConfig } from './doom-loop';
import { isPermissionRule, type PermissionRule } from './permission';
import type { ToolOutputTruncationConfig } from './tool-output';
import type { AgentAccessMode } from './types';
import { parseJsonc } from './jsonc';
import { sanitizeHooksConfig, type RuntimeHooksConfig } from './hooks';

export type AgentRuntimeConfig = {
  mode?: { default?: AgentAccessMode };
  compaction?: Partial<CompactionConfig>;
  truncation?: Partial<ToolOutputTruncationConfig>;
  doomLoop?: Partial<DoomLoopConfig>;
  permission?: { rules?: PermissionRule[] };
  agent?: { id?: string };
  tools?: { external?: { enabled?: boolean } };
  hooks?: RuntimeHooksConfig;
};

export type RuntimeConfigParseResult = {
  config: AgentRuntimeConfig;
  errors: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const getBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const getNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const getStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const result = value.filter((item): item is string => typeof item === 'string');
  return result.length > 0 ? result : undefined;
};

const extractRuntimeConfig = (data: unknown): AgentRuntimeConfig => {
  if (!isRecord(data)) return {};
  const agents = isRecord(data.agents) ? data.agents : undefined;
  const runtime = isRecord(agents?.runtime) ? agents?.runtime : undefined;
  if (!runtime) return {};

  const config: AgentRuntimeConfig = {};

  const mode = isRecord(runtime.mode) ? runtime.mode : undefined;
  const defaultMode = getString(mode?.default) as AgentAccessMode | undefined;
  if (defaultMode === 'agent' || defaultMode === 'full_access') {
    config.mode = { default: defaultMode };
  }

  const compaction = isRecord(runtime.compaction) ? runtime.compaction : undefined;
  if (compaction) {
    const parsed: Partial<CompactionConfig> = {};
    const contextWindow = getNumber(compaction.contextWindow);
    const outputBudget = getNumber(compaction.outputBudget);
    const triggerRatio = getNumber(compaction.triggerRatio);
    const fallbackCharLimit = getNumber(compaction.fallbackCharLimit);
    const protectedTurns = getNumber(compaction.protectedTurns);
    const protectedToolNames = getStringArray(compaction.protectedToolNames);
    if (contextWindow !== undefined) parsed.contextWindow = contextWindow;
    if (outputBudget !== undefined) parsed.outputBudget = outputBudget;
    if (triggerRatio !== undefined) parsed.triggerRatio = triggerRatio;
    if (fallbackCharLimit !== undefined) parsed.fallbackCharLimit = fallbackCharLimit;
    if (protectedTurns !== undefined) parsed.protectedTurns = protectedTurns;
    if (protectedToolNames) parsed.protectedToolNames = protectedToolNames;
    if (Object.keys(parsed).length > 0) {
      config.compaction = parsed;
    }
  }

  const truncation = isRecord(runtime.truncation) ? runtime.truncation : undefined;
  if (truncation) {
    const parsed: Partial<ToolOutputTruncationConfig> = {};
    const maxLines = getNumber(truncation.maxLines);
    const maxBytes = getNumber(truncation.maxBytes);
    const ttlDays = getNumber(truncation.ttlDays);
    if (maxLines !== undefined) parsed.maxLines = maxLines;
    if (maxBytes !== undefined) parsed.maxBytes = maxBytes;
    if (ttlDays !== undefined) parsed.ttlDays = ttlDays;
    if (Object.keys(parsed).length > 0) {
      config.truncation = parsed;
    }
  }

  const doomLoop = isRecord(runtime.doomLoop) ? runtime.doomLoop : undefined;
  if (doomLoop) {
    const parsed: Partial<DoomLoopConfig> = {};
    const maxAttempts = getNumber(doomLoop.maxAttempts);
    const maxToolCalls = getNumber(doomLoop.maxToolCalls);
    const sameToolThreshold = getNumber(doomLoop.sameToolThreshold);
    const maxSignatureBytes = getNumber(doomLoop.maxSignatureBytes);
    const cooldownToolCalls = getNumber(doomLoop.cooldownToolCalls);
    if (maxAttempts !== undefined) parsed.maxAttempts = maxAttempts;
    if (maxToolCalls !== undefined) parsed.maxToolCalls = maxToolCalls;
    if (sameToolThreshold !== undefined) parsed.sameToolThreshold = sameToolThreshold;
    if (maxSignatureBytes !== undefined) parsed.maxSignatureBytes = maxSignatureBytes;
    if (cooldownToolCalls !== undefined) parsed.cooldownToolCalls = cooldownToolCalls;
    if (Object.keys(parsed).length > 0) {
      config.doomLoop = parsed;
    }
  }

  const permission = isRecord(runtime.permission) ? runtime.permission : undefined;
  if (permission) {
    const rules = Array.isArray(permission.rules)
      ? (permission.rules.filter(isPermissionRule) as PermissionRule[])
      : undefined;
    if (rules && rules.length > 0) {
      config.permission = { rules };
    }
  }

  const agent = isRecord(runtime.agent) ? runtime.agent : undefined;
  const agentId = getString(agent?.id);
  if (agentId) {
    config.agent = { id: agentId };
  }

  const tools = isRecord(runtime.tools) ? runtime.tools : undefined;
  const external = isRecord(tools?.external) ? tools?.external : undefined;
  const externalEnabled = getBoolean(external?.enabled);
  if (externalEnabled !== undefined) {
    config.tools = { external: { enabled: externalEnabled } };
  }

  const hooks = sanitizeHooksConfig(runtime.hooks);
  if (hooks) {
    config.hooks = hooks;
  }

  return config;
};

export const parseRuntimeConfig = (content: string): RuntimeConfigParseResult => {
  const { data, errors } = parseJsonc(content);
  return { config: extractRuntimeConfig(data), errors };
};

export const mergeRuntimeConfig = (
  base: AgentRuntimeConfig,
  overrides?: AgentRuntimeConfig
): AgentRuntimeConfig => {
  if (!overrides) return base;
  return {
    mode: overrides.mode ?? base.mode,
    compaction: { ...(base.compaction ?? {}), ...(overrides.compaction ?? {}) },
    truncation: { ...(base.truncation ?? {}), ...(overrides.truncation ?? {}) },
    doomLoop: { ...(base.doomLoop ?? {}), ...(overrides.doomLoop ?? {}) },
    permission: {
      rules: overrides.permission?.rules ?? base.permission?.rules,
    },
    agent: overrides.agent ?? base.agent,
    tools: {
      external: {
        enabled: overrides.tools?.external?.enabled ?? base.tools?.external?.enabled,
      },
    },
    hooks: overrides.hooks ?? base.hooks,
  };
};
