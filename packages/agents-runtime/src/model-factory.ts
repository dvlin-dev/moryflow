import type { LanguageModelV3 } from '@ai-sdk/provider';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { aisdk } from '@openai/agents-extensions';
import {
  buildLanguageModelReasoningSettings,
  buildProviderModelRef,
  parseProviderModelRef,
  resolveRuntimeChatSdkType,
  type RuntimeChatSdkType,
} from '@moryflow/model-bank';

import {
  type AgentSettings,
  type UserProviderConfig,
  type CustomProviderConfig,
  type UserModelConfig,
  type ProviderSdkType,
  type PresetProvider,
  type MembershipConfig,
  type ModelThinkingProfile,
  type ReasoningConfig,
  type ThinkingLevelId,
  type ThinkingSelection,
  isMembershipModelId,
  extractMembershipModelId,
} from './types';
import { buildReasoningProviderOptions } from './reasoning-config';
import { resolveThinkingToReasoning, type ThinkingDowngradeReason } from './thinking-adapter';
import { buildThinkingProfile } from './thinking-profile';

/** 运行时服务商条目 */
interface RuntimeProviderEntry {
  id: string;
  name: string;
  sdkType: ProviderSdkType;
  apiKey: string;
  baseUrl?: string;
  modelIds: Set<string>;
  modelConfigMap: Map<string, UserModelConfig>;
  defaultModelId: string | undefined;
  isCustom: boolean;
}

type ResolvedModel =
  | {
      type: 'membership';
      modelId: string;
      actualModelId: string;
      apiKey: string;
      apiUrl: string;
    }
  | {
      type: 'provider';
      modelId: string;
      rawModelId: string;
      apiModelId: string;
      provider: RuntimeProviderEntry;
    };

const trimOrNull = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveThinkingSemanticSdkType = (
  resolved: ResolvedModel,
  transportSdkType: RuntimeChatSdkType
): ProviderSdkType => {
  if (resolved.type === 'membership') {
    return 'openai-compatible';
  }
  // Router 聚合场景统一走 openrouter 的 reasoning 协议语义。
  if (resolved.provider.id === 'openrouter') {
    return 'openrouter';
  }
  return transportSdkType;
};

const resolveTransportSdkType = (resolved: ResolvedModel): RuntimeChatSdkType => {
  if (resolved.type === 'membership') {
    return 'openai-compatible';
  }

  const runtimeSdkType = resolveRuntimeChatSdkType({
    providerId: resolved.provider.id,
    sdkType: resolved.provider.sdkType,
  });
  if (!runtimeSdkType) {
    throw new Error(
      `服务商 ${resolved.provider.id} 缺少显式 runtime sdkType 映射，请在 model-bank 中配置 provider -> adapter 映射`
    );
  }
  return runtimeSdkType;
};

/** 模型创建选项 */
interface CreateLanguageModelOptions {
  sdkType: RuntimeChatSdkType;
  apiKey: string;
  baseUrl: string | undefined;
  modelId: string;
  providerId: string;
  reasoning?: ReasoningConfig;
}

/**
 * 根据 SDK 类型创建语言模型
 */
const createLanguageModel = (options: CreateLanguageModelOptions): LanguageModelV3 => {
  const { sdkType, apiKey, baseUrl, modelId, providerId, reasoning } = options;
  const reasoningSettings = buildLanguageModelReasoningSettings({
    sdkType,
    reasoning,
  });

  switch (sdkType) {
    case 'openai': {
      const openaiChat = createOpenAI({ apiKey, baseURL: baseUrl }).chat as (
        modelId: string,
        settings?: Record<string, unknown>
      ) => LanguageModelV3;
      return openaiChat(
        modelId,
        reasoningSettings?.kind === 'chat-settings' ? reasoningSettings.settings : undefined
      );
    }

    case 'anthropic': {
      const anthropicChat = createAnthropic({ apiKey, baseURL: baseUrl }).chat as (
        modelId: string,
        settings?: Record<string, unknown>
      ) => LanguageModelV3;
      return anthropicChat(
        modelId,
        reasoningSettings?.kind === 'chat-settings' ? reasoningSettings.settings : undefined
      );
    }

    case 'google': {
      const googleChat = createGoogleGenerativeAI({ apiKey, baseURL: baseUrl }) as (
        modelId: string,
        settings?: Record<string, unknown>
      ) => LanguageModelV3;
      return googleChat(
        modelId,
        reasoningSettings?.kind === 'chat-settings' ? reasoningSettings.settings : undefined
      );
    }

    case 'openrouter': {
      const openrouter = createOpenRouter({ apiKey, baseURL: baseUrl });
      if (reasoningSettings?.kind === 'openrouter-settings') {
        return openrouter.chat(modelId, reasoningSettings.settings) as unknown as LanguageModelV3;
      }
      return openrouter.chat(modelId) as unknown as LanguageModelV3;
    }

    case 'openai-compatible': {
      const openAICompatible = createOpenAICompatible({
        name: providerId,
        apiKey,
        baseURL: baseUrl || 'https://api.openai.com/v1',
      }) as (modelId: string, settings?: Record<string, unknown>) => LanguageModelV3;
      return openAICompatible(
        modelId,
        reasoningSettings?.kind === 'chat-settings' ? reasoningSettings.settings : undefined
      );
    }

    default: {
      const exhaustiveCheck: never = sdkType;
      throw new Error(`Unsupported runtime sdk type: ${exhaustiveCheck}`);
    }
  }
};

/**
 * 构建预设服务商的运行时条目
 */
const buildPresetProviderEntry = (
  config: UserProviderConfig,
  preset: PresetProvider
): RuntimeProviderEntry | null => {
  const apiKey = trimOrNull(config.apiKey);
  if (!apiKey) return null;

  const enabledModelIds = new Set<string>();
  const modelConfigMap = new Map<string, UserModelConfig>();

  if (config.models.length === 0) {
    const defaultModelId =
      config.defaultModelId && preset.modelIds.includes(config.defaultModelId)
        ? config.defaultModelId
        : preset.modelIds[0];
    if (defaultModelId) {
      enabledModelIds.add(buildProviderModelRef(preset.id, defaultModelId));
    }
  } else {
    for (const modelConfig of config.models) {
      const modelRef = buildProviderModelRef(preset.id, modelConfig.id);
      modelConfigMap.set(modelRef, modelConfig);
      if (modelConfig.enabled) {
        if (preset.modelIds.includes(modelConfig.id) || modelConfig.isCustom) {
          enabledModelIds.add(modelRef);
        }
      }
    }
  }

  if (enabledModelIds.size === 0) return null;

  let resolvedDefaultModelId: string | undefined = config.defaultModelId
    ? buildProviderModelRef(preset.id, config.defaultModelId)
    : undefined;
  if (!resolvedDefaultModelId || !enabledModelIds.has(resolvedDefaultModelId)) {
    resolvedDefaultModelId = Array.from(enabledModelIds)[0];
  }

  return {
    id: preset.id,
    name: preset.name,
    sdkType: preset.sdkType,
    apiKey,
    baseUrl: trimOrNull(config.baseUrl) || preset.defaultBaseUrl,
    modelIds: enabledModelIds,
    modelConfigMap,
    defaultModelId: resolvedDefaultModelId,
    isCustom: false,
  };
};

/**
 * 构建自定义服务商的运行时条目
 */
const buildCustomProviderEntry = (config: CustomProviderConfig): RuntimeProviderEntry | null => {
  const apiKey = trimOrNull(config.apiKey);
  if (!apiKey) return null;

  const enabledModelIds = new Set(
    config.models
      .filter((m) => m.enabled)
      .map((model) => buildProviderModelRef(config.providerId, model.id))
  );
  const modelConfigMap = new Map<string, UserModelConfig>(
    config.models.map((modelConfig) => [
      buildProviderModelRef(config.providerId, modelConfig.id),
      modelConfig,
    ])
  );

  if (enabledModelIds.size === 0) return null;

  let resolvedDefaultModelId: string | undefined = config.defaultModelId
    ? buildProviderModelRef(config.providerId, config.defaultModelId)
    : undefined;
  if (!resolvedDefaultModelId || !enabledModelIds.has(resolvedDefaultModelId)) {
    resolvedDefaultModelId = Array.from(enabledModelIds)[0];
  }

  return {
    id: config.providerId,
    name: config.name,
    sdkType: 'openai-compatible',
    apiKey,
    baseUrl: trimOrNull(config.baseUrl) || undefined,
    modelIds: enabledModelIds,
    modelConfigMap,
    defaultModelId: resolvedDefaultModelId,
    isCustom: true,
  };
};

export interface ModelFactoryOptions {
  settings: AgentSettings;
  /** 预设服务商注册表 */
  providerRegistry: Record<string, PresetProvider>;
  /** 模型 ID 转换函数 */
  toApiModelId: (providerId: string, modelId: string) => string;
  /** 会员模型配置 - 可以是配置对象或返回配置的 getter 函数 */
  membership?: MembershipConfig | (() => MembershipConfig);
  /** 自定义 fetch 函数（用于 React Native 流式支持） */
  customFetch?: typeof globalThis.fetch;
}

/** 模型构建选项 */
export interface BuildModelOptions {
  /** 请求级思考模式 */
  thinking?: ThinkingSelection;
  /** 请求级思考档案（优先级高于模型默认档案） */
  thinkingProfile?: ModelThinkingProfile;
}

/** 模型构建结果 */
export interface BuildModelResult {
  modelId: string;
  baseModel: ReturnType<typeof aisdk>;
  /** Provider 特定选项（用于传递给 AI SDK） */
  providerOptions: Record<string, unknown>;
  /** 最终应用的思考等级（含降级结果） */
  resolvedThinkingLevel?: ThinkingLevelId;
  thinkingDowngradedToOff?: boolean;
  thinkingDowngradeReason?: ThinkingDowngradeReason;
}

export interface ModelFactory {
  buildModel(modelId?: string, options?: BuildModelOptions): BuildModelResult;
  /** 构建原始模型（用于 generateText 等简单调用） */
  buildRawModel(modelId?: string): { modelId: string; model: LanguageModelV3 };
  defaultModelId: string;
  getAvailableModels(): Array<{ providerId: string; providerName: string; modelId: string }>;
  providers: RuntimeProviderEntry[];
}

/**
 * 创建模型工厂
 */
export const createModelFactory = (options: ModelFactoryOptions): ModelFactory => {
  const { settings, providerRegistry, toApiModelId } = options;
  const runtimeProviders: RuntimeProviderEntry[] = [];

  // 处理预设服务商配置
  for (const config of settings.providers) {
    if (!config.enabled) continue;

    const preset = providerRegistry[config.providerId];
    if (!preset) continue;

    const entry = buildPresetProviderEntry(config, preset);
    if (entry) {
      runtimeProviders.push(entry);
    }
  }

  // 处理自定义服务商配置
  for (const config of settings.customProviders || []) {
    if (!config.enabled) continue;

    const entry = buildCustomProviderEntry(config);
    if (entry) {
      runtimeProviders.push(entry);
    }
  }

  const resolveDefaultModelId = (): string => {
    if (runtimeProviders.length === 0) return '';

    const globalDefault = trimOrNull(settings.model.defaultModel);
    if (globalDefault) {
      if (isMembershipModelId(globalDefault)) {
        return globalDefault;
      }
      const parsed = parseProviderModelRef(globalDefault);
      if (parsed) {
        const provider = runtimeProviders.find((p) => p.id === parsed.providerId);
        if (provider && provider.modelIds.has(globalDefault)) {
          return globalDefault;
        }
      }
    }

    const firstProvider = runtimeProviders[0];
    return firstProvider?.defaultModelId || '';
  };

  const resolvedDefaultModelId = resolveDefaultModelId();

  const resolveModel = (modelId?: string): ResolvedModel => {
    const targetModelId = modelId?.trim()?.length ? modelId.trim() : resolvedDefaultModelId;

    if (!targetModelId) {
      throw new Error('尚未配置默认模型，请在设置中配置服务商后再试');
    }

    // 会员模型
    if (isMembershipModelId(targetModelId)) {
      const membership =
        typeof options.membership === 'function' ? options.membership() : options.membership;

      if (!membership?.enabled) {
        throw new Error('会员模型未启用，请在设置中开启会员模型');
      }
      if (!membership?.token) {
        throw new Error('请先登录账户以使用会员模型');
      }

      return {
        type: 'membership',
        modelId: targetModelId,
        actualModelId: extractMembershipModelId(targetModelId),
        apiKey: membership.token,
        apiUrl: membership.apiUrl,
      };
    }

    // 普通服务商模型
    if (runtimeProviders.length === 0) {
      throw new Error('缺少可用的服务商，请先在设置中启用服务商并填写 API Key');
    }

    const parsedModelRef = parseProviderModelRef(targetModelId);
    if (!parsedModelRef) {
      throw new Error('模型标识格式无效，必须为 providerId/modelId');
    }

    const provider = runtimeProviders.find((entry) => entry.id === parsedModelRef.providerId);
    if (!provider) {
      throw new Error(`未找到服务商 ${parsedModelRef.providerId}，请先在设置中启用并配置 API Key`);
    }
    if (!provider.modelIds.has(targetModelId)) {
      throw new Error(
        `服务商 ${parsedModelRef.providerId} 未启用模型 ${parsedModelRef.modelId}，请先在设置中启用该模型`
      );
    }

    const apiModelId = provider.isCustom
      ? parsedModelRef.modelId
      : toApiModelId(provider.id, parsedModelRef.modelId);

    return {
      type: 'provider',
      modelId: targetModelId,
      rawModelId: parsedModelRef.modelId,
      apiModelId,
      provider,
    };
  };

  const resolveThinkingProfile = (
    resolved: ResolvedModel,
    requestProfile: ModelThinkingProfile | undefined,
    semanticSdkType: ProviderSdkType
  ): ModelThinkingProfile => {
    if (resolved.type === 'membership') {
      return buildThinkingProfile({
        modelId: resolved.actualModelId,
        providerId: 'openai',
        sdkType: semanticSdkType,
        supportsThinking: true,
        rawProfile: requestProfile,
      });
    }

    const modelConfig = resolved.provider.modelConfigMap.get(resolved.modelId);
    const supportsThinking = modelConfig?.customCapabilities?.reasoning ?? true;

    return buildThinkingProfile({
      modelId: resolved.rawModelId,
      providerId: resolved.provider.id,
      sdkType: semanticSdkType,
      supportsThinking,
      rawProfile: requestProfile,
      override: modelConfig?.thinking,
    });
  };

  const buildModel = (modelId?: string, buildOptions?: BuildModelOptions): BuildModelResult => {
    const resolved = resolveModel(modelId);
    const transportSdkType = resolveTransportSdkType(resolved);
    const semanticSdkType = resolveThinkingSemanticSdkType(resolved, transportSdkType);
    const thinkingProfile = resolveThinkingProfile(
      resolved,
      buildOptions?.thinkingProfile,
      semanticSdkType
    );
    const resolvedThinking = resolveThinkingToReasoning({
      sdkType: semanticSdkType,
      profile: thinkingProfile,
      requested: buildOptions?.thinking,
    });
    const effectiveReasoning = resolvedThinking.reasoning;

    if (resolved.type === 'membership') {
      const membershipModelFactory = createOpenAICompatible({
        name: 'membership',
        apiKey: resolved.apiKey,
        baseURL: `${resolved.apiUrl}/v1`,
        fetch: options.customFetch,
      }) as (modelId: string, settings?: Record<string, unknown>) => LanguageModelV3;
      const chatModel = membershipModelFactory(
        resolved.actualModelId,
        effectiveReasoning?.enabled
          ? {
              reasoningEffort: effectiveReasoning.effort ?? 'medium',
            }
          : undefined
      );

      const providerOptions = effectiveReasoning
        ? buildReasoningProviderOptions(semanticSdkType, effectiveReasoning)
        : {};

      return {
        modelId: resolved.modelId,
        baseModel: aisdk(chatModel),
        providerOptions,
        resolvedThinkingLevel: resolvedThinking.level,
        thinkingDowngradedToOff: resolvedThinking.downgradedToOff,
        thinkingDowngradeReason: resolvedThinking.downgradeReason,
      };
    }

    const transportReasoning =
      transportSdkType === semanticSdkType ? effectiveReasoning : undefined;

    // provider 类型
    const chatModel = createLanguageModel({
      sdkType: transportSdkType,
      apiKey: resolved.provider.apiKey,
      baseUrl: resolved.provider.baseUrl,
      modelId: resolved.apiModelId,
      providerId: resolved.provider.id,
      reasoning: transportReasoning,
    });

    const providerOptions = effectiveReasoning
      ? buildReasoningProviderOptions(semanticSdkType, effectiveReasoning)
      : {};

    return {
      modelId: resolved.modelId,
      baseModel: aisdk(chatModel),
      providerOptions,
      resolvedThinkingLevel: resolvedThinking.level,
      thinkingDowngradedToOff: resolvedThinking.downgradedToOff,
      thinkingDowngradeReason: resolvedThinking.downgradeReason,
    };
  };

  const buildRawModel = (modelId?: string): { modelId: string; model: LanguageModelV3 } => {
    const resolved = resolveModel(modelId);

    if (resolved.type === 'membership') {
      const model = createOpenAICompatible({
        name: 'membership',
        apiKey: resolved.apiKey,
        baseURL: `${resolved.apiUrl}/v1`,
        fetch: options.customFetch,
      })(resolved.actualModelId);

      return { modelId: resolved.modelId, model };
    }

    // provider 类型
    const model = createLanguageModel({
      sdkType: resolveTransportSdkType(resolved),
      apiKey: resolved.provider.apiKey,
      baseUrl: resolved.provider.baseUrl,
      modelId: resolved.apiModelId,
      providerId: resolved.provider.id,
    });

    return { modelId: resolved.modelId, model };
  };

  const getAvailableModels = () => {
    const models: Array<{
      providerId: string;
      providerName: string;
      modelId: string;
    }> = [];

    for (const provider of runtimeProviders) {
      for (const modelId of provider.modelIds) {
        models.push({
          providerId: provider.id,
          providerName: provider.name,
          modelId,
        });
      }
    }

    return models;
  };

  return {
    buildModel,
    buildRawModel,
    defaultModelId: resolvedDefaultModelId,
    getAvailableModels,
    providers: runtimeProviders,
  };
};
