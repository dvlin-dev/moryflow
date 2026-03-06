/**
 * [PROVIDES]: Chat Pane 模型分组与兜底处理
 * [DEPENDS]: model-registry, membership models
 * [POS]: 模型列表构建与展示数据源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { AgentSettings, UserProviderConfig, CustomProviderConfig } from '@shared/ipc';
import { buildThinkingProfileFromRaw } from '@moryflow/model-bank';
import {
  buildProviderModelRef,
  getModelByProviderAndId,
  getProviderById,
} from '@moryflow/model-bank/registry';
import type {
  ModelThinkingOverride,
  ModelThinkingProfile,
  ProviderSdkType,
  ThinkingLevelId,
} from '@moryflow/model-bank/registry';
import {
  type MembershipModel,
  buildMembershipModelId,
  MEMBERSHIP_PROVIDER_SLUG,
  MEMBERSHIP_PROVIDER_NAME,
} from '@/lib/server';

export type ModelOption = {
  id: string;
  name: string;
  provider: string;
  providerSlug?: string;
  providers: string[];
  description?: string;
  disabled?: boolean;
  thinkingProfile: ModelThinkingProfile;
  /** 是否是会员模型 */
  isMembership?: boolean;
  /** 会员模型所需等级（用于显示升级提示） */
  requiredTier?: string;
};

export type ModelGroup = {
  label: string;
  providerSlug: string;
  options: ModelOption[];
};

const KNOWN_PROVIDER_LOGOS = new Set([
  'openai',
  'openrouter',
  'claude',
  'anthropic',
  'azure',
  'google',
  'groq',
  'mistral',
  'deepseek',
  'perplexity',
  'xai',
  'moonshot',
  'zhipuai',
]);

const buildThinkingProfile = (input: {
  modelId?: string;
  providerId?: string;
  sdkType: ProviderSdkType;
  supportsThinking: boolean;
  override?: ModelThinkingOverride;
  rawProfile?: ModelThinkingProfile;
}): ModelThinkingProfile => {
  const profile = buildThinkingProfileFromRaw({
    modelId: input.modelId,
    providerId: input.providerId,
    sdkType: input.sdkType,
    supportsThinking: input.supportsThinking,
    rawProfile: input.rawProfile,
    defaultLevelOverride: input.override?.defaultLevel,
  });

  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel as ThinkingLevelId,
    levels: profile.levels.map((level) => ({
      id: level.id as ThinkingLevelId,
      label: level.label,
      ...(level.description ? { description: level.description } : {}),
      ...(level.visibleParams && level.visibleParams.length > 0
        ? { visibleParams: level.visibleParams }
        : {}),
    })),
  };
};

const resolveProviderSlug = (id: string | undefined | null) => {
  if (!id) {
    return undefined;
  }
  const normalized = id.trim().toLowerCase();
  return KNOWN_PROVIDER_LOGOS.has(normalized) ? normalized : undefined;
};

/**
 * 从预设服务商配置构建模型选项
 */
const buildOptionsFromPresetProvider = (
  config: UserProviderConfig
): { providerName: string; options: ModelOption[] } | null => {
  const preset = getProviderById(config.providerId);
  if (!preset) return null;

  const providerSlug = resolveProviderSlug(config.providerId);

  // 获取启用的模型
  const enabledModelIds = new Set(config.models.filter((m) => m.enabled).map((m) => m.id));

  // 如果用户没有配置模型，优先启用 provider 默认模型，否则回退到第一个模型。
  const defaultPresetModelId =
    config.defaultModelId && preset.modelIds.includes(config.defaultModelId)
      ? config.defaultModelId
      : preset.modelIds[0];

  // 如果用户没有配置模型，启用 defaultPresetModelId。
  const useDefaultModels =
    config.models.length === 0 || config.models.every((m) => !m.enabled && !m.isCustom);

  const options: ModelOption[] = [];

  // 用户自定义添加的模型（显示在最前面，最新的在最前）
  const customModels = config.models.filter((m) => m.isCustom && m.enabled);
  for (let i = customModels.length - 1; i >= 0; i--) {
    const model = customModels[i];
    const supportsThinking = model.customCapabilities?.reasoning ?? true;
    const modelRef = buildProviderModelRef(config.providerId, model.id);
    options.push({
      id: modelRef,
      name: model.customName || model.id,
      provider: preset.name,
      providerSlug,
      providers: providerSlug ? [providerSlug] : [],
      disabled: false,
      thinkingProfile: buildThinkingProfile({
        modelId: model.id,
        providerId: config.providerId,
        sdkType: preset.sdkType,
        supportsThinking,
        override: model.thinking,
      }),
    });
  }

  // 预设模型
  for (let i = 0; i < preset.modelIds.length; i++) {
    const modelId = preset.modelIds[i];
    const modelDef = getModelByProviderAndId(config.providerId, modelId);
    if (!modelDef) continue;

    const isEnabled = useDefaultModels
      ? Boolean(defaultPresetModelId && modelId === defaultPresetModelId)
      : enabledModelIds.has(modelId);

    if (!isEnabled) continue;

    // 检查用户是否自定义了名称
    const userConfig = config.models.find((m) => m.id === modelId && !m.isCustom);
    const displayName = userConfig?.customName || modelDef.shortName || modelDef.name;
    const supportsThinking =
      userConfig?.customCapabilities?.reasoning ?? modelDef.capabilities.reasoning;

    const modelRef = buildProviderModelRef(config.providerId, modelId);
    options.push({
      id: modelRef,
      name: displayName,
      provider: preset.name,
      providerSlug,
      providers: providerSlug ? [providerSlug] : [],
      disabled: false,
      thinkingProfile: buildThinkingProfile({
        modelId,
        providerId: config.providerId,
        sdkType: preset.sdkType,
        supportsThinking,
        override: userConfig?.thinking,
      }),
    });
  }

  return {
    providerName: preset.name,
    options,
  };
};

/**
 * 从自定义服务商配置构建模型选项
 */
const buildOptionsFromCustomProvider = (
  config: CustomProviderConfig
): { providerName: string; options: ModelOption[] } | null => {
  const providerSlug = resolveProviderSlug(config.providerId);

  const options: ModelOption[] = config.models
    .filter((m) => m.enabled)
    .map((model) => ({
      id: buildProviderModelRef(config.providerId, model.id),
      name: model.customName || model.id,
      provider: config.name,
      providerSlug,
      providers: providerSlug ? [providerSlug] : [],
      disabled: false,
      thinkingProfile: buildThinkingProfile({
        modelId: model.id,
        providerId: config.providerId,
        sdkType: 'openai-compatible',
        supportsThinking: model.customCapabilities?.reasoning ?? true,
        override: model.thinking,
      }),
    }));

  if (options.length === 0) return null;

  return {
    providerName: config.name,
    options,
  };
};

/**
 * 从 AgentSettings 构建模型分组
 */
export const buildModelGroupsFromSettings = (settings: AgentSettings): ModelGroup[] => {
  const groups: ModelGroup[] = [];

  // 处理预设服务商
  for (const config of settings.providers) {
    if (!config.enabled || !config.apiKey) continue;

    const result = buildOptionsFromPresetProvider(config);
    if (!result || result.options.length === 0) continue;

    groups.push({
      label: result.providerName,
      providerSlug: resolveProviderSlug(config.providerId) ?? config.providerId,
      options: result.options,
    });
  }

  // 处理自定义服务商
  for (const config of settings.customProviders || []) {
    if (!config.enabled || !config.apiKey) continue;

    const result = buildOptionsFromCustomProvider(config);
    if (!result || result.options.length === 0) continue;

    groups.push({
      label: result.providerName,
      providerSlug: resolveProviderSlug(config.providerId) ?? config.providerId,
      options: result.options,
    });
  }

  return groups;
};

/**
 * 构建会员模型分组
 */
export const buildMembershipModelGroup = (
  models: MembershipModel[],
  enabled: boolean
): ModelGroup | null => {
  if (!enabled || models.length === 0) {
    return null;
  }

  const options: ModelOption[] = models.map((model) => ({
    id: buildMembershipModelId(model.id),
    name: model.name,
    provider: MEMBERSHIP_PROVIDER_NAME,
    providerSlug: MEMBERSHIP_PROVIDER_SLUG,
    providers: [MEMBERSHIP_PROVIDER_SLUG],
    disabled: !model.available,
    thinkingProfile: buildThinkingProfile({
      sdkType: 'openai-compatible',
      supportsThinking: model.thinkingProfile.supportsThinking,
      rawProfile: model.thinkingProfile,
    }),
    isMembership: true,
    requiredTier: model.available ? undefined : model.minTier,
  }));

  return {
    label: MEMBERSHIP_PROVIDER_NAME,
    providerSlug: MEMBERSHIP_PROVIDER_SLUG,
    options,
  };
};
