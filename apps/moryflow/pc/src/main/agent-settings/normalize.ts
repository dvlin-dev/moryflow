import type {
  AgentModelSettings,
  AgentPersonalizationSettings,
  AgentSettings,
  AgentSettingsUpdate,
  AgentUISettings,
  MCPSettings,
  UserProviderConfig,
  CustomProviderConfig,
} from '../../shared/ipc.js';
import { getAllProviderIds } from '@moryflow/model-bank/registry';
import { agentSettingsSchema, defaultAgentSettings, uiSchema } from './const.js';

const PRESET_PROVIDER_ID_SET = new Set(getAllProviderIds());

const coerceModel = (input: Partial<AgentModelSettings> | undefined): AgentModelSettings => {
  return {
    defaultModel:
      typeof input?.defaultModel === 'string'
        ? input.defaultModel
        : input?.defaultModel === null
          ? null
          : defaultAgentSettings.model.defaultModel,
  };
};

const coercePersonalization = (
  input: Partial<AgentPersonalizationSettings> | undefined
): AgentPersonalizationSettings => {
  return {
    customInstructions:
      typeof input?.customInstructions === 'string' ? input.customInstructions : '',
  };
};

const coerceMcpSettings = (input: Partial<MCPSettings> | undefined): MCPSettings => {
  const stdio = Array.isArray(input?.stdio) ? input.stdio : defaultAgentSettings.mcp.stdio;
  const streamableHttp = Array.isArray(input?.streamableHttp)
    ? input.streamableHttp
    : defaultAgentSettings.mcp.streamableHttp;

  return {
    stdio,
    streamableHttp,
  };
};

const coerceProviders = (providers?: UserProviderConfig[] | null): UserProviderConfig[] => {
  if (!Array.isArray(providers)) {
    return [];
  }
  return providers.filter(
    (p) => p && typeof p === 'object' && typeof p.providerId === 'string' && p.providerId.length > 0
  );
};

const coerceCustomProviders = (
  providers?: CustomProviderConfig[] | null
): CustomProviderConfig[] => {
  if (!Array.isArray(providers)) {
    return [];
  }

  const seenIds = new Set<string>();
  const normalized: CustomProviderConfig[] = [];

  for (const provider of providers) {
    if (!provider || typeof provider !== 'object' || typeof provider.providerId !== 'string') {
      continue;
    }

    const providerId = provider.providerId.trim();
    if (!providerId || providerId.includes('/')) {
      continue;
    }
    if (PRESET_PROVIDER_ID_SET.has(providerId) || seenIds.has(providerId)) {
      continue;
    }

    seenIds.add(providerId);
    normalized.push({
      ...provider,
      providerId,
    });
  }

  return normalized;
};

const coerceUiSettings = (input: Partial<AgentUISettings> | undefined): AgentUISettings =>
  uiSchema.parse(input ?? defaultAgentSettings.ui) as AgentUISettings;

/**
 * 规范化持久化配置，剔除破损结构并补齐默认值。
 */
export const normalizeAgentSettings = (input: unknown): AgentSettings => {
  if (!input || typeof input !== 'object') {
    return defaultAgentSettings;
  }
  const payload = input as Partial<AgentSettings>;

  try {
    return agentSettingsSchema.parse({
      model: coerceModel(payload.model),
      personalization: coercePersonalization(payload.personalization),
      mcp: coerceMcpSettings(payload.mcp),
      providers: coerceProviders(payload.providers),
      customProviders: coerceCustomProviders(payload.customProviders),
      ui: coerceUiSettings(payload.ui),
    }) as AgentSettings;
  } catch {
    // 新用户最佳实践：不做历史结构迁移，遇到破损/旧结构直接回退到默认设置。
    return defaultAgentSettings;
  }
};

/**
 * 基于当前状态和增量 patch 生成下一版持久化配置。
 */
export const buildPatchedAgentSettings = (
  current: AgentSettings,
  patch: AgentSettingsUpdate
): AgentSettings => {
  return agentSettingsSchema.parse({
    model: coerceModel({
      defaultModel: patch.model?.defaultModel ?? current.model.defaultModel,
    }),
    personalization: coercePersonalization({
      customInstructions:
        patch.personalization?.customInstructions ?? current.personalization.customInstructions,
    }),
    mcp: coerceMcpSettings({
      stdio: patch.mcp?.stdio ?? current.mcp.stdio,
      streamableHttp: patch.mcp?.streamableHttp ?? current.mcp.streamableHttp,
    }),
    providers: coerceProviders(patch.providers ?? current.providers),
    customProviders: coerceCustomProviders(patch.customProviders ?? current.customProviders),
    ui: coerceUiSettings({
      theme: patch.ui?.theme ?? current.ui.theme,
    }),
  }) as AgentSettings;
};
