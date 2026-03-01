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

export interface ThinkingReasoningRuntimeInput {
  enabled?: boolean;
  effort?: ThinkingReasoningEffort | string;
  exclude?: boolean;
  includeThoughts?: boolean;
  maxTokens?: number;
  rawConfig?: Record<string, unknown>;
}

export type ThinkingLanguageModelReasoningSettings =
  | {
      kind: 'chat-settings';
      settings: Record<string, unknown>;
    }
  | {
      kind: 'openrouter-settings';
      settings: {
        extraBody: Record<string, unknown>;
        includeReasoning: true;
      };
    };

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
const DEFAULT_ANTHROPIC_BUDGET = 12_000;

const THINKING_CAPABLE_SDK_TYPES = new Set<ProviderSdkType>([
  'openai',
  'openai-compatible',
  'openrouter',
  'anthropic',
  'google',
  'xai',
]);

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
  const enableReasoning = parseBooleanString(params.enableReasoning);
  const enableReasoningByLevel = normalizedLevel === 'on' && enableReasoning !== false;
  const shouldEnableOpenRouterReasoning = enableReasoning === true || enableReasoningByLevel;

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
      if (
        resolvedEffort === undefined &&
        maxTokensFromParams === undefined &&
        !shouldEnableOpenRouterReasoning
      ) {
        return undefined;
      }
      return {
        enabled: true,
        ...(resolvedEffort ? { effort: resolvedEffort } : {}),
        ...(maxTokensFromParams !== undefined ? { maxTokens: maxTokensFromParams } : {}),
      };
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

export const supportsThinkingForSdkType = (sdkType?: string): boolean => {
  const normalizedSdkType = normalizeSdkType(sdkType);
  if (!normalizedSdkType) {
    return false;
  }
  return THINKING_CAPABLE_SDK_TYPES.has(normalizedSdkType);
};

export const buildOpenRouterReasoningExtraBody = (
  reasoning: ThinkingReasoningRuntimeInput
): Record<string, unknown> => {
  if (reasoning.rawConfig) {
    return reasoning.rawConfig;
  }

  const normalizedMaxTokens = clampReasoningBudget(reasoning.maxTokens);
  const normalizedEffort = normalizeReasoningEffort(reasoning.effort);

  if (reasoning.exclude === true) {
    return { reasoning: { exclude: true } };
  }

  // OpenRouter one-of: effort / max_tokens 不能同时下发。
  if (normalizedMaxTokens !== undefined) {
    return { reasoning: { exclude: false, max_tokens: normalizedMaxTokens } };
  }

  if (normalizedEffort) {
    return { reasoning: { exclude: false, effort: normalizedEffort } };
  }

  return { reasoning: { enabled: reasoning.enabled ?? true } };
};

export const buildLanguageModelReasoningSettings = (input: {
  reasoning?: ThinkingReasoningRuntimeInput;
  sdkType?: string;
}): ThinkingLanguageModelReasoningSettings | undefined => {
  const sdkType = normalizeSdkType(input.sdkType);
  const reasoning = input.reasoning;
  if (!sdkType || !reasoning || (!reasoning.enabled && !reasoning.rawConfig)) {
    return undefined;
  }

  switch (sdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return {
        kind: 'chat-settings',
        settings: {
          reasoningEffort: normalizeReasoningEffort(reasoning.effort) ?? 'medium',
        },
      };
    case 'anthropic':
      return {
        kind: 'chat-settings',
        settings: {
          thinking: {
            type: 'enabled',
            budgetTokens: clampReasoningBudget(reasoning.maxTokens) ?? DEFAULT_ANTHROPIC_BUDGET,
          },
        },
      };
    case 'google':
      return {
        kind: 'chat-settings',
        settings: {
          thinkingConfig: {
            includeThoughts: reasoning.includeThoughts ?? true,
            thinkingBudget: clampReasoningBudget(reasoning.maxTokens),
          },
        },
      };
    case 'openrouter':
      return {
        kind: 'openrouter-settings',
        settings: {
          includeReasoning: true,
          extraBody: buildOpenRouterReasoningExtraBody(reasoning),
        },
      };
    default:
      return undefined;
  }
};
