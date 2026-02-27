/**
 * [PROVIDES]: buildReasoningProviderOptions - 根据 SDK 类型构建 reasoning providerOptions
 * [DEPENDS]: ReasoningConfig, ProviderSdkType, ModelThinkingProfile
 * [POS]: 统一处理不同服务商的 reasoning 配置差异
 */
import { resolveReasoningConfigFromThinkingLevel } from '@moryflow/model-bank';
import type {
  ModelThinkingProfile,
  ReasoningConfig,
  ProviderSdkType,
  ThinkingSelection,
} from './types';

const SUPPORTED_EFFORT = new Set<NonNullable<ReasoningConfig['effort']>>([
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'none',
]);

const SDK_PROTOCOL_THINKING_CAPABLE = new Set<ProviderSdkType>([
  'openai',
  'openai-compatible',
  'openrouter',
  'anthropic',
  'google',
  'xai',
]);

const MIN_REASONING_BUDGET = 1;
const MAX_REASONING_BUDGET = 262_144;

const normalizeReasoningEffort = (value: unknown): ReasoningConfig['effort'] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  const effort = (normalized === 'max' ? 'xhigh' : normalized) as NonNullable<
    ReasoningConfig['effort']
  >;
  return SUPPORTED_EFFORT.has(effort) ? effort : undefined;
};

const clampReasoningBudget = (value: number | undefined): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.min(MAX_REASONING_BUDGET, Math.max(MIN_REASONING_BUDGET, Math.floor(value)));
};

const DEFAULT_ANTHROPIC_BUDGET = 8_192;

export function supportsThinkingForSdkType(sdkType: ProviderSdkType): boolean {
  return SDK_PROTOCOL_THINKING_CAPABLE.has(sdkType);
}

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

export function resolveReasoningConfigFromThinkingSelection(input: {
  sdkType: ProviderSdkType;
  profile: ModelThinkingProfile;
  selection?: ThinkingSelection;
}): ReasoningConfig | undefined {
  const { sdkType, profile, selection } = input;
  if (!selection || selection.mode === 'off') {
    return undefined;
  }

  if (!profile.supportsThinking) {
    return undefined;
  }

  if (!profile.levels.some((level) => level.id === selection.level)) {
    return undefined;
  }

  if (selection.level === 'off') {
    return undefined;
  }

  const levelOption = profile.levels.find((level) => level.id === selection.level);
  if (!levelOption) {
    return undefined;
  }

  const resolved = resolveReasoningConfigFromThinkingLevel({
    sdkType,
    levelId: levelOption.id,
    visibleParams: (levelOption.visibleParams ?? []).map((param) => ({
      key: param.key,
      value: param.value,
    })),
  });
  if (!resolved) {
    return undefined;
  }

  const normalizedResolved: ReasoningConfig =
    sdkType === 'openrouter' ? { ...resolved, exclude: false } : resolved;

  return clampReasoningConfigForSdkType(sdkType, normalizedResolved);
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
          ...buildOpenRouterExtraBody(config),
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

export function buildOpenRouterExtraBody(config: ReasoningConfig): Record<string, unknown> {
  if (config.rawConfig) {
    return config.rawConfig;
  }

  const normalizedMaxTokens = clampReasoningBudget(config.maxTokens);
  const normalizedEffort = normalizeReasoningEffort(config.effort) ?? 'medium';
  const reasoningConfig: Record<string, unknown> = {
    exclude: config.exclude ?? false,
  };

  // OpenRouter 要求 effort / max_tokens 二选一；budget 优先级更高。
  if (normalizedMaxTokens !== undefined) {
    reasoningConfig.max_tokens = normalizedMaxTokens;
  } else {
    reasoningConfig.effort = normalizedEffort;
  }

  return { reasoning: reasoningConfig };
}
