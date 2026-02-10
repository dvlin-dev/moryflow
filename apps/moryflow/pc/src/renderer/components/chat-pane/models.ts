/**
 * [PROVIDES]: Chat Pane 模型分组与兜底处理
 * [DEPENDS]: model-registry, membership models
 * [POS]: 模型列表构建与展示数据源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { AgentSettings, UserProviderConfig, CustomProviderConfig } from '@shared/ipc';
import { getProviderById, modelRegistry } from '@shared/model-registry';
import {
  type MembershipModel,
  isMembershipModelId,
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

  // 如果用户没有配置模型，只启用第一个模型（最新的）
  const useDefaultModels =
    config.models.length === 0 || config.models.every((m) => !m.enabled && !m.isCustom);

  const options: ModelOption[] = [];

  // 用户自定义添加的模型（显示在最前面，最新的在最前）
  const customModels = config.models.filter((m) => m.isCustom && m.enabled);
  for (let i = customModels.length - 1; i >= 0; i--) {
    const model = customModels[i];
    options.push({
      id: model.id,
      name: model.customName || model.id,
      provider: preset.name,
      providerSlug,
      providers: providerSlug ? [providerSlug] : [],
      disabled: false,
    });
  }

  // 预设模型
  for (let i = 0; i < preset.modelIds.length; i++) {
    const modelId = preset.modelIds[i];
    const modelDef = modelRegistry[modelId];
    if (!modelDef) continue;

    // 默认只启用第一个模型
    const isEnabled = useDefaultModels ? i === 0 : enabledModelIds.has(modelId);

    if (!isEnabled) continue;

    // 检查用户是否自定义了名称
    const userConfig = config.models.find((m) => m.id === modelId && !m.isCustom);
    const displayName = userConfig?.customName || modelDef.shortName || modelDef.name;

    options.push({
      id: modelId,
      name: displayName,
      provider: preset.name,
      providerSlug,
      providers: providerSlug ? [providerSlug] : [],
      disabled: false,
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
      id: model.id,
      name: model.customName || model.name || model.id,
      provider: config.name,
      providerSlug,
      providers: providerSlug ? [providerSlug] : [],
      disabled: false,
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
 * 确保指定的模型包含在分组中
 * 注意：会员模型（membership: 前缀）会单独处理，不创建自定义分组
 */
export const ensureModelIncluded = (
  groups: ModelGroup[],
  modelId?: string | null,
  fallbackProvider = 'Custom'
) => {
  if (!modelId) {
    return groups;
  }

  // 会员模型由外部合并，这里不创建自定义分组
  if (isMembershipModelId(modelId)) {
    return groups;
  }

  const exists = groups.some((group) => group.options.some((option) => option.id === modelId));
  if (exists) {
    return groups;
  }

  return [
    ...groups,
    {
      label: fallbackProvider,
      providerSlug: 'custom',
      options: [
        {
          id: modelId,
          name: modelId,
          provider: fallbackProvider,
          providerSlug: 'custom',
          providers: [],
        },
      ],
    },
  ];
};

// 为了向后兼容，保留旧的函数名
export const buildModelGroupsFromProviders = buildModelGroupsFromSettings;

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
    isMembership: true,
    requiredTier: model.available ? undefined : model.minTier,
  }));

  return {
    label: MEMBERSHIP_PROVIDER_NAME,
    providerSlug: MEMBERSHIP_PROVIDER_SLUG,
    options,
  };
};
