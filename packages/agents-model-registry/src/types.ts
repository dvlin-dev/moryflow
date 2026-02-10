/**
 * AI 服务商和模型注册表类型定义
 * 参考 LobeHub 设计，采用预设服务商 + 预设模型的模式
 */

/** 模型输入输出模态 */
export type ModelModality = 'text' | 'image' | 'audio' | 'video' | 'pdf';

export interface ModelModalities {
  input: ModelModality[];
  output: ModelModality[];
}

/** 模型类型分类 */
export type ModelCategory = 'chat' | 'image' | 'embedding' | 'asr' | 'tts';

/** 模型限制 */
export interface ModelLimits {
  /** 上下文窗口大小 */
  context: number;
  /** 最大输出 token */
  output: number;
}

/** 模型能力标签 */
export interface ModelCapabilities {
  /** 是否支持附件/多模态输入 */
  attachment: boolean;
  /** 是否支持推理/思考模式 */
  reasoning: boolean;
  /** 是否支持温度调节 */
  temperature: boolean;
  /** 是否支持工具调用 */
  toolCall: boolean;
  /** 是否开源权重 */
  openWeights: boolean;
}

/** 预设模型定义 */
export interface PresetModel {
  /** 模型在服务商处的 ID（用于 API 调用） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 简称（用于紧凑显示） */
  shortName?: string;
  /** 模型分类 */
  category: ModelCategory;
  /** 能力标签 */
  capabilities: ModelCapabilities;
  /** 输入输出模态 */
  modalities: ModelModalities;
  /** 模型限制 */
  limits: ModelLimits;
  /** 知识截止日期 */
  knowledgeCutoff?: string;
  /** 发布日期 */
  releaseDate?: string;
}

/** 用户自定义模型能力配置 */
export interface CustomModelCapabilities {
  /** 是否支持附件/多模态输入 */
  attachment?: boolean;
  /** 是否支持推理/思考模式 */
  reasoning?: boolean;
  /** 是否支持温度调节 */
  temperature?: boolean;
  /** 是否支持工具调用 */
  toolCall?: boolean;
}

/** 用户模型配置（运行时） */
export interface UserModelConfig {
  /** 模型 ID */
  id: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否为用户自定义添加的模型（非预设） */
  isCustom?: boolean;
  /**
   * @deprecated Legacy display name for older desktop builds.
   * Use `customName` instead.
   */
  name?: string;
  /** 自定义模型显示名称 */
  customName?: string;
  /** 自定义上下文窗口大小 */
  customContext?: number;
  /** 自定义最大输出 */
  customOutput?: number;
  /** 自定义模型能力 */
  customCapabilities?: CustomModelCapabilities;
  /** 自定义输入模态 */
  customInputModalities?: ModelModality[];
}

/** 服务商认证方式 */
export type ProviderAuthType =
  | 'api-key' // 标准 API Key
  | 'oauth' // OAuth 登录（如 GitHub Copilot）
  | 'none'; // 无需认证

/** 服务商 SDK 类型 */
export type ProviderSdkType =
  | 'openai' // OpenAI SDK
  | 'anthropic' // Anthropic SDK
  | 'google' // Google AI SDK
  | 'xai' // xAI SDK
  | 'openrouter' // OpenRouter SDK
  | 'openai-compatible'; // OpenAI 兼容协议（默认，支持大多数服务商）

/** 本地后端类型 */
export type LocalBackendType = 'ollama' | 'llama.cpp';

/** 预设服务商定义 */
export interface PresetProvider {
  /** 服务商唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 图标名称（用于显示） */
  icon?: string;
  /** 官方文档链接 */
  docUrl: string;
  /** 默认 API 地址 */
  defaultBaseUrl?: string;
  /** 认证方式 */
  authType: ProviderAuthType;
  /** SDK 类型 */
  sdkType: ProviderSdkType;
  /** 预设模型 ID 列表（引用 modelRegistry 中的模型） */
  modelIds: string[];
  /** 模型 ID 映射（服务商特定 ID -> 预设模型 ID） */
  modelIdMapping?: Record<string, string>;
  /** 是否支持自定义模型 */
  allowCustomModels?: boolean;
  /** 特殊说明 */
  description?: string;
  /** 排序权重（越大越靠前） */
  sortOrder?: number;
  /** 本地后端类型（仅本地服务商） */
  localBackend?: LocalBackendType;
  /** 原生 API 地址（用于模型管理等非推理功能） */
  nativeApiBaseUrl?: string;
  /** 是否在列表中隐藏（开发中的功能） */
  hidden?: boolean;
}

/** 用户服务商配置（持久化） */
export interface UserProviderConfig {
  /** 对应预设服务商 ID */
  providerId: string;
  /** 是否启用 */
  enabled: boolean;
  /** API Key */
  apiKey: string | null;
  /** 自定义 API 地址（覆盖默认） */
  baseUrl: string | null;
  /** 模型配置（仅存储与默认不同的配置） */
  models: UserModelConfig[];
  /** 默认模型 ID */
  defaultModelId: string | null;
}

/** 自定义服务商配置 */
export interface CustomProviderConfig {
  /** 固定为 'custom' 前缀 + 唯一 ID */
  providerId: string;
  /** 自定义服务商名称 */
  name: string;
  /** 是否启用 */
  enabled: boolean;
  /** API Key */
  apiKey: string | null;
  /** API 地址 */
  baseUrl: string | null;
  /** SDK 类型（用于选择正确的调用方式） */
  sdkType: ProviderSdkType;
  /**
   * 自定义模型列表
   * 与 UserProviderConfig.models 保持一致，支持 customName/customContext 等参数（用于 UI 与运行时预算计算）。
   */
  models: UserModelConfig[];
  /** 默认模型 ID */
  defaultModelId: string | null;
}

/** 判断是否为自定义服务商 */
export function isCustomProvider(
  config: UserProviderConfig | CustomProviderConfig
): config is CustomProviderConfig {
  return config.providerId.startsWith('custom-');
}

/** 服务商配置联合类型 */
export type ProviderConfig = UserProviderConfig | CustomProviderConfig;

/** 模型注册表类型 */
export type ModelRegistry = Record<string, Omit<PresetModel, 'id'>>;

/** 服务商注册表类型 */
export type ProviderRegistry = Record<string, PresetProvider>;

/** 运行时模型信息（包含完整信息） */
export interface RuntimeModelInfo {
  /** 模型 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 简称 */
  shortName?: string;
  /** 所属服务商 ID */
  providerId: string;
  /** 所属服务商名称 */
  providerName: string;
  /** 模型能力 */
  capabilities: ModelCapabilities;
  /** 模型限制 */
  limits: ModelLimits;
  /** 是否启用 */
  enabled: boolean;
}

/** 运行时服务商信息 */
export interface RuntimeProviderInfo {
  /** 服务商 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 图标 */
  icon?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否已配置（有 API Key） */
  configured: boolean;
  /** 连接状态 */
  status: 'unknown' | 'connected' | 'error';
  /** 可用模型列表 */
  models: RuntimeModelInfo[];
  /** 默认模型 ID */
  defaultModelId: string | null;
}
