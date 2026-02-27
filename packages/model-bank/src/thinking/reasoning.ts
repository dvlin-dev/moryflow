/**
 * [PROVIDES]: Thinking visible params -> reasoning config 单源映射
 * [DEPENDS]: thinking types/resolver/rules
 * [POS]: 供 runtime/server/admin 统一复用，避免重复实现漂移
 *
 * [PROTOCOL]: 本文件规则变更必须补充同目录单元测试
 */

import type { ProviderSdkType } from '../types/llm';

import { normalizeThinkingLevelId } from './rules';
import { resolveProviderSdkType } from './resolver';
import type { ThinkingVisibleParam } from './types';

export type ThinkingReasoningEffort = 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';

export interface ThinkingReasoningConfig {
  effort?: ThinkingReasoningEffort;
  enabled: true;
  includeThoughts?: boolean;
  maxTokens?: number;
}

const SUPPORTED_EFFORT = new Set<ThinkingReasoningEffort>([
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'none',
]);

const THINKING_LEVEL_BUDGETS: Record<string, number> = {
  minimal: 1024,
  low: 4096,
  medium: 8192,
  high: 16_384,
  max: 32_768,
  xhigh: 49_152,
};

const THINKING_LEVEL_EFFORTS: Record<string, ThinkingReasoningEffort> = {
  minimal: 'minimal',
  low: 'low',
  medium: 'medium',
  high: 'high',
  max: 'xhigh',
  xhigh: 'xhigh',
};

const MIN_REASONING_BUDGET = 1;
const MAX_REASONING_BUDGET = 262_144;

const normalizeReasoningEffort = (value: unknown): ThinkingReasoningEffort | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  const effort = (normalized === 'max' ? 'xhigh' : normalized) as ThinkingReasoningEffort;
  return SUPPORTED_EFFORT.has(effort) ? effort : undefined;
};

const normalizeThinkingLevelToken = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized === 'none' || normalized === 'disabled' ? 'off' : normalized;
};

const clampReasoningBudget = (value: number | undefined): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.min(MAX_REASONING_BUDGET, Math.max(MIN_REASONING_BUDGET, Math.floor(value)));
};

const parseBooleanString = (value: string | undefined): boolean | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return undefined;
};

const parseNumberString = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

type ThinkingVisibleParamMap = Record<string, string>;

const toVisibleParamMap = (params: ThinkingVisibleParam[] | undefined): ThinkingVisibleParamMap => {
  const map: ThinkingVisibleParamMap = {};
  for (const param of params ?? []) {
    if (!param || typeof param.key !== 'string' || typeof param.value !== 'string') {
      continue;
    }
    const key = param.key.trim();
    const value = param.value.trim();
    if (!key || !value) {
      continue;
    }
    map[key] = value;
  }
  return map;
};

const normalizeSdkType = (sdkType?: string): ProviderSdkType | undefined => {
  if (!sdkType) {
    return undefined;
  }
  const resolved = resolveProviderSdkType({ sdkType });
  return (resolved || sdkType.trim()) as ProviderSdkType;
};

export const resolveReasoningConfigFromThinkingLevel = (input: {
  levelId: string;
  sdkType?: string;
  visibleParams?: ThinkingVisibleParam[];
}): ThinkingReasoningConfig | undefined => {
  const normalizedLevel = normalizeThinkingLevelId(input.levelId);
  if (normalizedLevel === 'off') {
    return undefined;
  }

  const normalizedSdkType = normalizeSdkType(input.sdkType);
  if (!normalizedSdkType) {
    return undefined;
  }

  const params = toVisibleParamMap(input.visibleParams);
  const effort = normalizeReasoningEffort(
    params.reasoningEffort ?? params.effort ?? params.thinkingLevel
  );
  const levelToken =
    normalizeThinkingLevelToken(params.reasoningEffort) ??
    normalizeThinkingLevelToken(params.effort) ??
    normalizeThinkingLevelToken(params.thinkingLevel) ??
    normalizeThinkingLevelToken(normalizedLevel);
  const effortFromLevel = levelToken ? THINKING_LEVEL_EFFORTS[levelToken] : undefined;
  const resolvedEffort = effort ?? effortFromLevel;
  const maxTokensFromParams = clampReasoningBudget(parseNumberString(params.thinkingBudget));
  const maxTokensFromLevel =
    levelToken && levelToken !== 'off' ? THINKING_LEVEL_BUDGETS[levelToken] : undefined;
  const includeThoughts = parseBooleanString(params.includeThoughts);

  switch (normalizedSdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return resolvedEffort
        ? {
            enabled: true,
            effort: resolvedEffort,
          }
        : undefined;
    case 'openrouter':
      return resolvedEffort || maxTokensFromParams !== undefined
        ? {
            enabled: true,
            effort: resolvedEffort ?? 'medium',
            maxTokens: maxTokensFromParams,
          }
        : undefined;
    case 'anthropic':
      return maxTokensFromParams !== undefined || maxTokensFromLevel !== undefined
        ? {
            enabled: true,
            maxTokens: maxTokensFromParams ?? maxTokensFromLevel,
          }
        : undefined;
    case 'google':
      return maxTokensFromParams !== undefined ||
        maxTokensFromLevel !== undefined ||
        includeThoughts !== undefined
        ? {
            enabled: true,
            includeThoughts: includeThoughts ?? true,
            maxTokens: maxTokensFromParams ?? maxTokensFromLevel,
          }
        : undefined;
    default:
      return undefined;
  }
};
