import type {
  AgentModelParamSetting,
  AgentModelSettings,
  AgentModelParams,
  AgentSettings,
  AgentSettingsUpdate,
  AgentSystemPromptSettings,
  AgentUISettings,
  MCPSettings,
  UserProviderConfig,
  CustomProviderConfig,
} from '../../shared/ipc.js';
import { agentSettingsSchema, defaultAgentSettings, uiSchema } from './const.js';

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

const coerceSystemPrompt = (
  input: Partial<AgentSystemPromptSettings> | undefined
): AgentSystemPromptSettings => {
  const mode = input?.mode === 'custom' ? 'custom' : 'default';
  const template =
    typeof input?.template === 'string' && input.template.trim().length > 0
      ? input.template
      : defaultAgentSettings.systemPrompt.template;

  return {
    mode,
    template,
  };
};

const resolveNumber = (
  value: unknown,
  fallback: number,
  min?: number,
  max?: number,
  integer?: boolean
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  let next = value;
  if (typeof min === 'number') {
    next = Math.max(min, next);
  }
  if (typeof max === 'number') {
    next = Math.min(max, next);
  }
  if (integer) {
    next = Math.floor(next);
  }
  return next;
};

const coerceModelParamEntry = (
  input: unknown,
  fallback: AgentModelParamSetting,
  min?: number,
  max?: number,
  integer?: boolean
): AgentModelParamSetting => {
  if (!input || typeof input !== 'object') {
    return fallback;
  }
  const payload = input as Partial<AgentModelParamSetting>;
  return {
    mode: payload.mode === 'custom' ? 'custom' : 'default',
    value: resolveNumber(payload.value, fallback.value, min, max, integer),
  };
};

const coerceModelParams = (input: Partial<AgentModelParams> | undefined): AgentModelParams => {
  const payload = input && typeof input === 'object' ? input : undefined;
  const fallback = defaultAgentSettings.modelParams;

  return {
    temperature: coerceModelParamEntry(payload?.temperature, fallback.temperature, 0, 2),
    topP: coerceModelParamEntry(payload?.topP, fallback.topP, 0, 1),
    maxTokens: coerceModelParamEntry(payload?.maxTokens, fallback.maxTokens, 1, undefined, true),
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
  // 过滤掉无效的配置
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
  // 过滤掉无效的配置
  return providers.filter(
    (p) =>
      p &&
      typeof p === 'object' &&
      typeof p.providerId === 'string' &&
      p.providerId.startsWith('custom-')
  );
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

  return agentSettingsSchema.parse({
    model: coerceModel(payload.model),
    systemPrompt: coerceSystemPrompt(payload.systemPrompt),
    modelParams: coerceModelParams(payload.modelParams),
    mcp: coerceMcpSettings(payload.mcp),
    providers: coerceProviders(payload.providers),
    customProviders: coerceCustomProviders(payload.customProviders),
    ui: coerceUiSettings(payload.ui),
  }) as AgentSettings;
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
    systemPrompt: coerceSystemPrompt({
      mode: patch.systemPrompt?.mode ?? current.systemPrompt.mode,
      template: patch.systemPrompt?.template ?? current.systemPrompt.template,
    }),
    modelParams: coerceModelParams({
      temperature: patch.modelParams?.temperature ?? current.modelParams.temperature,
      topP: patch.modelParams?.topP ?? current.modelParams.topP,
      maxTokens: patch.modelParams?.maxTokens ?? current.modelParams.maxTokens,
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
