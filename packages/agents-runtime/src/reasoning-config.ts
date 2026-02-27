/**
 * [PROVIDES]: buildReasoningProviderOptions - 根据 SDK 类型构建 reasoning providerOptions
 * [DEPENDS]: ReasoningConfig, ProviderSdkType, ModelThinkingProfile
 * [POS]: 统一处理不同服务商的 reasoning 配置差异
 */
import {
  getDefaultThinkingLevelsForProvider,
  getDefaultThinkingVisibleParams,
} from '@moryflow/api';
import type {
  ModelThinkingProfile,
  ReasoningConfig,
  ProviderSdkType,
  ThinkingLevelId,
  ThinkingSelection,
  ThinkingVisibleParam,
  ThinkingVisibleParamKey,
} from './types';

const SUPPORTED_EFFORT = new Set<NonNullable<ReasoningConfig['effort']>>([
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'none',
]);

const MIN_REASONING_BUDGET = 1;
const MAX_REASONING_BUDGET = 262_144;

const normalizeReasoningEffort = (value: unknown): ReasoningConfig['effort'] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const effort = value as NonNullable<ReasoningConfig['effort']>;
  return SUPPORTED_EFFORT.has(effort) ? effort : undefined;
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

const DEFAULT_ANTHROPIC_BUDGET = (() => {
  const defaultParams = getDefaultThinkingVisibleParams({
    providerType: 'anthropic',
    levelId: 'medium',
  });
  const budget = defaultParams.find((item) => item.key === 'thinkingBudget');
  return clampReasoningBudget(parseNumberString(budget?.value)) ?? 8_192;
})();

const toVisibleParamMap = (
  params: ThinkingVisibleParam[] | undefined
): Partial<Record<ThinkingVisibleParamKey, string>> => {
  const map: Partial<Record<ThinkingVisibleParamKey, string>> = {};
  for (const param of params ?? []) {
    if (!param || typeof param.key !== 'string') {
      continue;
    }
    if (typeof param.value !== 'string' || param.value.trim().length === 0) {
      continue;
    }
    map[param.key] = param.value.trim();
  }
  return map;
};

export function supportsThinkingForSdkType(sdkType: ProviderSdkType): boolean {
  return getDefaultThinkingLevelsForProvider(sdkType).some((level) => level !== 'off');
}

export function getDefaultThinkingLevelsForSdkType(
  sdkType: ProviderSdkType,
  supportsThinking: boolean
): ThinkingLevelId[] {
  if (!supportsThinking || !supportsThinkingForSdkType(sdkType)) {
    return ['off'];
  }

  return getDefaultThinkingLevelsForProvider(sdkType) as ThinkingLevelId[];
}

export function sanitizeThinkingLevels(levels: ThinkingLevelId[] | undefined): ThinkingLevelId[] {
  const normalized = Array.isArray(levels) ? levels.filter(Boolean) : [];
  const deduped = Array.from(new Set(normalized));
  if (!deduped.includes('off')) {
    deduped.unshift('off');
  }
  return deduped.length > 0 ? deduped : ['off'];
}

export const getDefaultVisibleParamsForLevel = (input: {
  sdkType: ProviderSdkType;
  level: ThinkingLevelId;
}): ThinkingVisibleParam[] => {
  const { sdkType, level } = input;
  if (level === 'off' || !supportsThinkingForSdkType(sdkType)) {
    return [];
  }

  return getDefaultThinkingVisibleParams({
    providerType: sdkType,
    levelId: level,
  }) as ThinkingVisibleParam[];
};

export const clampReasoningConfigForSdkType = (
  sdkType: ProviderSdkType,
  config: ReasoningConfig | undefined
): ReasoningConfig | undefined => {
  if (!config?.enabled) {
    return undefined;
  }

  switch (sdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return {
        enabled: true,
        effort: normalizeReasoningEffort(config.effort) ?? 'medium',
      };
    case 'openrouter':
      return {
        enabled: true,
        effort: normalizeReasoningEffort(config.effort) ?? 'medium',
        maxTokens: clampReasoningBudget(config.maxTokens),
        exclude: config.exclude ?? false,
        ...(config.rawConfig ? { rawConfig: config.rawConfig } : {}),
      };
    case 'anthropic':
      return {
        enabled: true,
        maxTokens: clampReasoningBudget(config.maxTokens) ?? DEFAULT_ANTHROPIC_BUDGET,
      };
    case 'google':
      return {
        enabled: true,
        includeThoughts: config.includeThoughts ?? true,
        maxTokens: clampReasoningBudget(config.maxTokens),
      };
    default:
      return undefined;
  }
};

const resolveReasoningFromProfileLevel = (input: {
  sdkType: ProviderSdkType;
  level: ThinkingLevelId;
  profile: ModelThinkingProfile;
}): ReasoningConfig | undefined => {
  const levelOption = input.profile.levels.find((item) => item.id === input.level);
  if (!levelOption) {
    return undefined;
  }

  const params = toVisibleParamMap(levelOption.visibleParams);
  const effort = normalizeReasoningEffort(params.reasoningEffort);
  const maxTokens = clampReasoningBudget(parseNumberString(params.thinkingBudget));
  const includeThoughts = parseBooleanString(params.includeThoughts);

  switch (input.sdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return effort
        ? {
            enabled: true,
            effort,
          }
        : undefined;
    case 'openrouter':
      return effort || maxTokens !== undefined
        ? {
            enabled: true,
            effort: effort ?? 'medium',
            maxTokens,
            exclude: false,
          }
        : undefined;
    case 'anthropic':
      return maxTokens !== undefined
        ? {
            enabled: true,
            maxTokens,
          }
        : undefined;
    case 'google':
      return maxTokens !== undefined || includeThoughts !== undefined
        ? {
            enabled: true,
            includeThoughts: includeThoughts ?? true,
            maxTokens,
          }
        : undefined;
    default:
      return undefined;
  }
};

export function resolveReasoningConfigFromThinkingSelection(input: {
  sdkType: ProviderSdkType;
  profile: ModelThinkingProfile;
  selection?: ThinkingSelection;
}): ReasoningConfig | undefined {
  const { sdkType, profile, selection } = input;
  if (!selection || selection.mode === 'off') {
    return undefined;
  }

  if (!supportsThinkingForSdkType(sdkType)) {
    return undefined;
  }

  if (!profile.levels.some((level) => level.id === selection.level)) {
    return undefined;
  }

  if (selection.level === 'off') {
    return undefined;
  }

  const resolved = resolveReasoningFromProfileLevel({
    sdkType,
    level: selection.level,
    profile,
  });

  return clampReasoningConfigForSdkType(sdkType, resolved);
}

/**
 * 根据 SDK 类型构建 providerOptions
 */
export function buildReasoningProviderOptions(
  sdkType: ProviderSdkType,
  config: ReasoningConfig
): Record<string, unknown> {
  if (!config.enabled) return {};

  switch (sdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return {
        openai: {
          reasoningEffort: config.effort ?? 'medium',
        },
      };

    case 'openrouter':
      return {
        openrouter: {
          ...(config.rawConfig
            ? config.rawConfig
            : {
                reasoning: {
                  effort: config.effort ?? 'medium',
                  max_tokens: config.maxTokens,
                  exclude: config.exclude ?? false,
                },
              }),
        },
      };

    case 'google':
      return {
        google: {
          thinkingConfig: {
            includeThoughts: config.includeThoughts ?? true,
            thinkingBudget: config.maxTokens,
          },
        },
      };

    case 'anthropic':
      return {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: config.maxTokens,
          },
        },
      };

    default:
      return {};
  }
}
