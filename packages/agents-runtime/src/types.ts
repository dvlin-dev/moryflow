import type { RunContext } from '@aiget/agents'
import type { Model } from '@aiget/agents-core'

/**
 * 附件上下文
 */
export interface AgentAttachmentContext {
  filename?: string
  mediaType?: string
  content?: string
  truncated?: boolean
  filePath?: string
}

/**
 * 聊天上下文
 */
export interface AgentChatContext {
  /** 当前聚焦的文件路径（相对 Vault） */
  filePath?: string
  /** 额外的上下文摘要 */
  summary?: string
}

/**
 * 模型构建器函数类型
 */
export type ModelBuilder = (modelId?: string) => { modelId: string; baseModel: Model }

/**
 * Agent 运行时上下文
 * 通过 RunContext 注入到所有工具中
 */
export interface AgentContext {
  /** 当前 Vault 的根目录绝对路径 */
  vaultRoot: string
  /** 当前会话 ID */
  chatId: string
  /** 可选的用户标识 */
  userId?: string
  /** 模型构建器，用于子代理创建时获取配置好的模型 */
  buildModel?: ModelBuilder
}

/**
 * 从 RunContext 中提取 vaultRoot
 */
export const getVaultRootFromContext = (
  runContext?: RunContext<AgentContext>
): string | undefined => runContext?.context?.vaultRoot

/**
 * 服务商 SDK 类型
 */
export type ProviderSdkType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'openrouter'
  | 'openai-compatible'

/**
 * 用户模型配置
 */
export interface UserModelConfig {
  id: string
  enabled: boolean
  isCustom?: boolean
}

/**
 * 用户服务商配置
 */
export interface UserProviderConfig {
  providerId: string
  enabled: boolean
  apiKey: string | null
  baseUrl?: string | null
  models: UserModelConfig[]
  defaultModelId?: string | null
}

/**
 * 自定义服务商配置
 */
export interface CustomProviderConfig {
  providerId: string
  name: string
  enabled: boolean
  sdkType: ProviderSdkType
  apiKey: string | null
  baseUrl?: string | null
  models: UserModelConfig[]
  defaultModelId?: string | null
}

/**
 * 全局模型设置
 */
export interface AgentModelSettings {
  /** 全局默认模型 ID（格式: providerId/modelId） */
  defaultModel: string | null
}

/**
 * Agent 设置
 */
export interface AgentSettings {
  /** 全局模型设置 */
  model: AgentModelSettings
  /** 预设服务商配置 */
  providers: UserProviderConfig[]
  /** 自定义服务商配置 */
  customProviders: CustomProviderConfig[]
}

/**
 * 预设服务商定义
 */
export interface PresetProvider {
  id: string
  name: string
  sdkType: ProviderSdkType
  modelIds: string[]
  defaultBaseUrl?: string
}

/**
 * Token 使用量
 */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Reasoning/思考模式配置
 */
export interface ReasoningConfig {
  /** 是否启用 reasoning */
  enabled: boolean

  /**
   * 思考强度等级（OpenRouter/OpenAI 风格）
   * - xhigh: ~95% max_tokens
   * - high: ~80% max_tokens
   * - medium: ~50% max_tokens
   * - low: ~20% max_tokens
   * - minimal: ~10% max_tokens
   * - none: 禁用
   */
  effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none'

  /** 思考 token 预算（Anthropic/Gemini 风格） */
  maxTokens?: number

  /** 是否在响应中排除思考内容 */
  exclude?: boolean

  /** 是否包含思考内容（Gemini 风格） */
  includeThoughts?: boolean
}

/**
 * 会员模型配置
 */
export interface MembershipConfig {
  /** 是否启用会员模型 */
  enabled: boolean
  /** 会员 API 地址 */
  apiUrl: string
  /** 用户的 session token */
  token: string | null
}

// 从共享包重新导出会员模型相关常量和工具函数
export {
  MEMBERSHIP_MODEL_PREFIX,
  isMembershipModelId,
  extractMembershipModelId,
  buildMembershipModelId,
} from '@aiget/api'
