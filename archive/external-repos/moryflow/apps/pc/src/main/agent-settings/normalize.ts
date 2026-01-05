import type {
  AgentModelSettings,
  AgentSettings,
  AgentSettingsUpdate,
  AgentUISettings,
  MCPSettings,
  UserProviderConfig,
  CustomProviderConfig,
} from '../../shared/ipc.js'
import { agentSettingsSchema, defaultAgentSettings, uiSchema } from './const.js'

const coerceModel = (input: Partial<AgentModelSettings> | undefined): AgentModelSettings => {
  return {
    defaultModel:
      typeof input?.defaultModel === 'string'
        ? input.defaultModel
        : input?.defaultModel === null
          ? null
          : defaultAgentSettings.model.defaultModel,
  }
}

const coerceMcpSettings = (input: Partial<MCPSettings> | undefined): MCPSettings => {
  const stdio = Array.isArray(input?.stdio) ? input.stdio : defaultAgentSettings.mcp.stdio
  const streamableHttp = Array.isArray(input?.streamableHttp)
    ? input.streamableHttp
    : defaultAgentSettings.mcp.streamableHttp

  return {
    stdio,
    streamableHttp,
  }
}

const coerceProviders = (providers?: UserProviderConfig[] | null): UserProviderConfig[] => {
  if (!Array.isArray(providers)) {
    return []
  }
  // 过滤掉无效的配置
  return providers.filter(
    (p) => p && typeof p === 'object' && typeof p.providerId === 'string' && p.providerId.length > 0
  )
}

const coerceCustomProviders = (
  providers?: CustomProviderConfig[] | null
): CustomProviderConfig[] => {
  if (!Array.isArray(providers)) {
    return []
  }
  // 过滤掉无效的配置
  return providers.filter(
    (p) =>
      p &&
      typeof p === 'object' &&
      typeof p.providerId === 'string' &&
      p.providerId.startsWith('custom-')
  )
}

const coerceUiSettings = (input: Partial<AgentUISettings> | undefined): AgentUISettings =>
  uiSchema.parse(input ?? defaultAgentSettings.ui) as AgentUISettings

/**
 * 规范化持久化配置，剔除破损结构并补齐默认值。
 */
export const normalizeAgentSettings = (input: unknown): AgentSettings => {
  if (!input || typeof input !== 'object') {
    return defaultAgentSettings
  }
  const payload = input as Partial<AgentSettings>

  return agentSettingsSchema.parse({
    model: coerceModel(payload.model),
    mcp: coerceMcpSettings(payload.mcp),
    providers: coerceProviders(payload.providers),
    customProviders: coerceCustomProviders(payload.customProviders),
    ui: coerceUiSettings(payload.ui),
  }) as AgentSettings
}

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
    mcp: coerceMcpSettings({
      stdio: patch.mcp?.stdio ?? current.mcp.stdio,
      streamableHttp: patch.mcp?.streamableHttp ?? current.mcp.streamableHttp,
    }),
    providers: coerceProviders(patch.providers ?? current.providers),
    customProviders: coerceCustomProviders(patch.customProviders ?? current.customProviders),
    ui: coerceUiSettings({
      theme: patch.ui?.theme ?? current.ui.theme,
    }),
  }) as AgentSettings
}
