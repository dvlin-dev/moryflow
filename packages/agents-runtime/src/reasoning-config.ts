/**
 * [PROVIDES]: buildReasoningProviderOptions - 根据 SDK 类型构建 reasoning providerOptions
 * [DEPENDS]: ReasoningConfig, ProviderSdkType, ModelThinkingProfile
 * [POS]: 统一处理不同服务商的 reasoning 配置差异
 */
import {
  buildLanguageModelReasoningSettings,
  buildOpenRouterReasoningExtraBody,
  resolveReasoningConfigFromThinkingLevel,
  supportsThinkingForSdkType as supportsThinkingForSdkTypeFromModelBank,
} from '@moryflow/model-bank';
import type {
  ModelThinkingProfile,
  ProviderSdkType,
  ReasoningConfig,
  ThinkingSelection,
} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
};

const toReasoningConfigFromModelSettings = (
  sdkType: ProviderSdkType,
  settings: ReturnType<typeof buildLanguageModelReasoningSettings>
): ReasoningConfig | undefined => {
  if (!settings) {
    return undefined;
  }

  if (settings.kind === 'openrouter-settings') {
    const reasoningRecord = isRecord(settings.settings.extraBody.reasoning)
      ? settings.settings.extraBody.reasoning
      : null;
    if (!reasoningRecord) {
      return {
        enabled: true,
        rawConfig: settings.settings.extraBody,
      };
    }
    return {
      enabled: true,
      ...(typeof reasoningRecord.effort === 'string'
        ? { effort: reasoningRecord.effort as ReasoningConfig['effort'] }
        : {}),
      ...(toFiniteNumber(reasoningRecord.max_tokens) !== undefined
        ? { maxTokens: toFiniteNumber(reasoningRecord.max_tokens) }
        : {}),
      exclude: typeof reasoningRecord.exclude === 'boolean' ? reasoningRecord.exclude : false,
      rawConfig: settings.settings.extraBody,
    };
  }

  const rawSettings = settings.settings;
  if (isRecord(rawSettings.thinking)) {
    return {
      enabled: true,
      ...(toFiniteNumber(rawSettings.thinking.budgetTokens) !== undefined
        ? { maxTokens: toFiniteNumber(rawSettings.thinking.budgetTokens) }
        : {}),
    };
  }

  if (isRecord(rawSettings.thinkingConfig)) {
    return {
      enabled: true,
      includeThoughts:
        typeof rawSettings.thinkingConfig.includeThoughts === 'boolean'
          ? rawSettings.thinkingConfig.includeThoughts
          : true,
      ...(toFiniteNumber(rawSettings.thinkingConfig.thinkingBudget) !== undefined
        ? { maxTokens: toFiniteNumber(rawSettings.thinkingConfig.thinkingBudget) }
        : {}),
    };
  }

  if (typeof rawSettings.reasoningEffort === 'string') {
    return {
      enabled: true,
      effort: rawSettings.reasoningEffort as ReasoningConfig['effort'],
    };
  }

  // 未识别形态时，仅在 openrouter 返回 rawConfig 兜底。
  if (sdkType === 'openrouter') {
    return {
      enabled: true,
      rawConfig: rawSettings,
    };
  }

  return undefined;
};

export function supportsThinkingForSdkType(sdkType: ProviderSdkType): boolean {
  return supportsThinkingForSdkTypeFromModelBank(sdkType);
}

export const clampReasoningConfigForSdkType = (
  sdkType: ProviderSdkType,
  config: ReasoningConfig | undefined
): ReasoningConfig | undefined =>
  toReasoningConfigFromModelSettings(
    sdkType,
    buildLanguageModelReasoningSettings({
      sdkType,
      reasoning: config,
    })
  );

export function resolveReasoningConfigFromThinkingSelection(input: {
  profile: ModelThinkingProfile;
  sdkType: ProviderSdkType;
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
  const settings = buildLanguageModelReasoningSettings({
    sdkType,
    reasoning: config,
  });
  if (!settings) {
    return {};
  }

  if (settings.kind === 'openrouter-settings') {
    return {
      openrouter: settings.settings.extraBody,
    };
  }

  switch (sdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return {
        openai: settings.settings,
      };
    case 'google':
      return {
        google: settings.settings,
      };
    case 'anthropic':
      return {
        anthropic: settings.settings,
      };
    default:
      return {};
  }
}

export function buildOpenRouterExtraBody(config: ReasoningConfig): Record<string, unknown> {
  return buildOpenRouterReasoningExtraBody(config);
}
