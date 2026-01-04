import type { LanguageModelV3 } from '@ai-sdk/provider'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createXai } from '@ai-sdk/xai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { aisdk } from '@aiget/agents-extensions'

import {
  type AgentSettings,
  type UserProviderConfig,
  type CustomProviderConfig,
  type ProviderSdkType,
  type PresetProvider,
  type MembershipConfig,
  type ReasoningConfig,
  isMembershipModelId,
  extractMembershipModelId,
} from './types'
import { buildReasoningProviderOptions } from './reasoning-config'

/** 运行时服务商条目 */
interface RuntimeProviderEntry {
  id: string
  name: string
  sdkType: ProviderSdkType
  apiKey: string
  baseUrl?: string
  modelIds: Set<string>
  defaultModelId: string | undefined
  isCustom: boolean
}

const trimOrNull = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** 模型创建选项 */
interface CreateLanguageModelOptions {
  sdkType: ProviderSdkType
  apiKey: string
  baseUrl: string | undefined
  modelId: string
  providerId: string
  reasoning?: ReasoningConfig
}

/**
 * 根据 SDK 类型创建语言模型
 */
const createLanguageModel = (options: CreateLanguageModelOptions): LanguageModelV3 => {
  const { sdkType, apiKey, baseUrl, modelId, providerId, reasoning } = options

  switch (sdkType) {
    case 'openai':
      return createOpenAI({ apiKey, baseURL: baseUrl }).chat(modelId)

    case 'anthropic':
      return createAnthropic({ apiKey, baseURL: baseUrl }).chat(modelId)

    case 'google':
      return createGoogleGenerativeAI({ apiKey, baseURL: baseUrl })(modelId)

    case 'xai':
      return createXai({ apiKey, baseURL: baseUrl }).chat(modelId)

    case 'openrouter': {
      const openrouter = createOpenRouter({ apiKey, baseURL: baseUrl })
      // OpenRouter 支持在模型级别配置 reasoning
      if (reasoning?.enabled) {
        return openrouter.chat(modelId, {
          includeReasoning: true,
          extraBody: {
            reasoning: {
              effort: reasoning.effort ?? 'medium',
              max_tokens: reasoning.maxTokens,
              exclude: reasoning.exclude ?? false,
            },
          },
        }) as unknown as LanguageModelV3
      }
      return openrouter.chat(modelId) as unknown as LanguageModelV3
    }

    case 'openai-compatible':
    default:
      return createOpenAICompatible({
        name: providerId,
        apiKey,
        baseURL: baseUrl || 'https://api.openai.com/v1',
      })(modelId)
  }
}

/**
 * 构建预设服务商的运行时条目
 */
const buildPresetProviderEntry = (
  config: UserProviderConfig,
  preset: PresetProvider,
  toApiModelId: (providerId: string, modelId: string) => string
): RuntimeProviderEntry | null => {
  const apiKey = trimOrNull(config.apiKey)
  if (!apiKey) return null

  const enabledModelIds = new Set<string>()

  if (config.models.length === 0) {
    if (preset.modelIds.length > 0) {
      enabledModelIds.add(preset.modelIds[0])
    }
  } else {
    for (const modelConfig of config.models) {
      if (modelConfig.enabled) {
        if (preset.modelIds.includes(modelConfig.id) || modelConfig.isCustom) {
          enabledModelIds.add(modelConfig.id)
        }
      }
    }
  }

  if (enabledModelIds.size === 0) return null

  let resolvedDefaultModelId: string | undefined = config.defaultModelId ?? undefined
  if (!resolvedDefaultModelId || !enabledModelIds.has(resolvedDefaultModelId)) {
    resolvedDefaultModelId = Array.from(enabledModelIds)[0]
  }

  return {
    id: preset.id,
    name: preset.name,
    sdkType: preset.sdkType,
    apiKey,
    baseUrl: trimOrNull(config.baseUrl) || preset.defaultBaseUrl,
    modelIds: enabledModelIds,
    defaultModelId: resolvedDefaultModelId,
    isCustom: false,
  }
}

/**
 * 构建自定义服务商的运行时条目
 */
const buildCustomProviderEntry = (
  config: CustomProviderConfig
): RuntimeProviderEntry | null => {
  const apiKey = trimOrNull(config.apiKey)
  if (!apiKey) return null

  const enabledModelIds = new Set(
    config.models.filter((m) => m.enabled).map((m) => m.id)
  )

  if (enabledModelIds.size === 0) return null

  let resolvedDefaultModelId: string | undefined = config.defaultModelId ?? undefined
  if (!resolvedDefaultModelId || !enabledModelIds.has(resolvedDefaultModelId)) {
    resolvedDefaultModelId = Array.from(enabledModelIds)[0]
  }

  return {
    id: config.providerId,
    name: config.name,
    sdkType: config.sdkType,
    apiKey,
    baseUrl: trimOrNull(config.baseUrl) || undefined,
    modelIds: enabledModelIds,
    defaultModelId: resolvedDefaultModelId,
    isCustom: true,
  }
}

export interface ModelFactoryOptions {
  settings: AgentSettings
  /** 预设服务商注册表 */
  providerRegistry: Record<string, PresetProvider>
  /** 模型 ID 转换函数 */
  toApiModelId: (providerId: string, modelId: string) => string
  /** 会员模型配置 - 可以是配置对象或返回配置的 getter 函数 */
  membership?: MembershipConfig | (() => MembershipConfig)
  /** 自定义 fetch 函数（用于 React Native 流式支持） */
  customFetch?: typeof globalThis.fetch
}

/** 模型构建选项 */
export interface BuildModelOptions {
  /** Reasoning/思考模式配置 */
  reasoning?: ReasoningConfig
}

/** 模型构建结果 */
export interface BuildModelResult {
  modelId: string
  baseModel: ReturnType<typeof aisdk>
  /** Provider 特定选项（用于传递给 AI SDK） */
  providerOptions: Record<string, unknown>
}

export interface ModelFactory {
  buildModel(modelId?: string, options?: BuildModelOptions): BuildModelResult
  /** 构建原始模型（用于 generateText 等简单调用） */
  buildRawModel(modelId?: string): { modelId: string; model: LanguageModelV3 }
  defaultModelId: string
  getAvailableModels(): Array<{ providerId: string; providerName: string; modelId: string }>
  providers: RuntimeProviderEntry[]
}

/**
 * 创建模型工厂
 */
export const createModelFactory = (options: ModelFactoryOptions): ModelFactory => {
  const { settings, providerRegistry, toApiModelId } = options
  const runtimeProviders: RuntimeProviderEntry[] = []

  // 处理预设服务商配置
  for (const config of settings.providers) {
    if (!config.enabled) continue

    const preset = providerRegistry[config.providerId]
    if (!preset) continue

    const entry = buildPresetProviderEntry(config, preset, toApiModelId)
    if (entry) {
      runtimeProviders.push(entry)
    }
  }

  // 处理自定义服务商配置
  for (const config of settings.customProviders || []) {
    if (!config.enabled) continue

    const entry = buildCustomProviderEntry(config)
    if (entry) {
      runtimeProviders.push(entry)
    }
  }

  const findProviderForModel = (
    modelId: string
  ): RuntimeProviderEntry | undefined => {
    return runtimeProviders.find((entry) => entry.modelIds.has(modelId))
  }

  const resolveDefaultModelId = (): string => {
    if (runtimeProviders.length === 0) return ''

    const globalDefault = trimOrNull(settings.model.defaultModel)
    if (globalDefault) {
      const [providerId, ...modelParts] = globalDefault.split('/')
      const modelId = modelParts.join('/')

      if (providerId && modelId) {
        const provider = runtimeProviders.find((p) => p.id === providerId)
        if (provider && provider.modelIds.has(modelId)) {
          return modelId
        }
      } else if (providerId) {
        const provider = findProviderForModel(providerId)
        if (provider) {
          return providerId
        }
      }
    }

    const firstProvider = runtimeProviders[0]
    return firstProvider?.defaultModelId || ''
  }

  const resolvedDefaultModelId = resolveDefaultModelId()

  /** 解析模型配置（公共逻辑） */
  type ResolvedModel =
    | { type: 'membership'; modelId: string; actualModelId: string; apiKey: string; apiUrl: string }
    | { type: 'provider'; modelId: string; apiModelId: string; provider: RuntimeProviderEntry }

  const resolveModel = (modelId?: string): ResolvedModel => {
    const targetModelId = modelId?.trim()?.length
      ? modelId.trim()
      : resolvedDefaultModelId

    if (!targetModelId) {
      throw new Error('尚未配置默认模型，请在设置中配置服务商后再试')
    }

    // 会员模型
    if (isMembershipModelId(targetModelId)) {
      const membership = typeof options.membership === 'function'
        ? options.membership()
        : options.membership

      if (!membership?.enabled) {
        throw new Error('会员模型未启用，请在设置中开启会员模型')
      }
      if (!membership?.token) {
        throw new Error('请先登录账户以使用会员模型')
      }

      return {
        type: 'membership',
        modelId: targetModelId,
        actualModelId: extractMembershipModelId(targetModelId),
        apiKey: membership.token,
        apiUrl: membership.apiUrl,
      }
    }

    // 普通服务商模型
    if (runtimeProviders.length === 0) {
      throw new Error('缺少可用的服务商，请先在设置中启用服务商并填写 API Key')
    }

    const provider = findProviderForModel(targetModelId)
    if (!provider) {
      throw new Error(
        `未找到模型 ${targetModelId} 对应的服务商，请在设置中启用相应服务商并配置 API Key`
      )
    }

    const apiModelId = provider.isCustom
      ? targetModelId
      : toApiModelId(provider.id, targetModelId)

    return {
      type: 'provider',
      modelId: targetModelId,
      apiModelId,
      provider,
    }
  }

  const buildModel = (modelId?: string, buildOptions?: BuildModelOptions): BuildModelResult => {
    const resolved = resolveModel(modelId)

    if (resolved.type === 'membership') {
      const chatModel = createOpenAICompatible({
        name: 'membership',
        apiKey: resolved.apiKey,
        baseURL: `${resolved.apiUrl}/v1`,
        fetch: options.customFetch,
      })(resolved.actualModelId)

      const providerOptions = buildOptions?.reasoning
        ? buildReasoningProviderOptions('openai-compatible', buildOptions.reasoning)
        : {}

      return {
        modelId: resolved.modelId,
        baseModel: aisdk(chatModel),
        providerOptions,
      }
    }

    // provider 类型
    const chatModel = createLanguageModel({
      sdkType: resolved.provider.sdkType,
      apiKey: resolved.provider.apiKey,
      baseUrl: resolved.provider.baseUrl,
      modelId: resolved.apiModelId,
      providerId: resolved.provider.id,
      reasoning: buildOptions?.reasoning,
    })

    const providerOptions = buildOptions?.reasoning
      ? buildReasoningProviderOptions(resolved.provider.sdkType, buildOptions.reasoning)
      : {}

    return {
      modelId: resolved.modelId,
      baseModel: aisdk(chatModel),
      providerOptions,
    }
  }

  const buildRawModel = (modelId?: string): { modelId: string; model: LanguageModelV3 } => {
    const resolved = resolveModel(modelId)

    if (resolved.type === 'membership') {
      const model = createOpenAICompatible({
        name: 'membership',
        apiKey: resolved.apiKey,
        baseURL: `${resolved.apiUrl}/v1`,
        fetch: options.customFetch,
      })(resolved.actualModelId)

      return { modelId: resolved.modelId, model }
    }

    // provider 类型
    const model = createLanguageModel({
      sdkType: resolved.provider.sdkType,
      apiKey: resolved.provider.apiKey,
      baseUrl: resolved.provider.baseUrl,
      modelId: resolved.apiModelId,
      providerId: resolved.provider.id,
    })

    return { modelId: resolved.modelId, model }
  }

  const getAvailableModels = () => {
    const models: Array<{
      providerId: string
      providerName: string
      modelId: string
    }> = []

    for (const provider of runtimeProviders) {
      for (const modelId of provider.modelIds) {
        models.push({
          providerId: provider.id,
          providerName: provider.name,
          modelId,
        })
      }
    }

    return models
  }

  return {
    buildModel,
    buildRawModel,
    defaultModelId: resolvedDefaultModelId,
    getAvailableModels,
    providers: runtimeProviders,
  }
}
