/**
 * [DEFINES]: 模型注册表相关类型定义
 * [USED_BY]: transformer.ts, search.ts, 外部消费方
 * [POS]: 类型基础设施
 */

/**
 * 上游原始模型数据结构（LiteLLM 格式）
 */
export interface UpstreamModel {
  litellm_provider: string
  max_input_tokens?: number
  max_output_tokens?: number
  max_tokens?: number
  mode?:
    | 'chat'
    | 'embedding'
    | 'image_generation'
    | 'audio_transcription'
    | 'audio_speech'
    | 'completion'
    | 'rerank'
  input_cost_per_token?: number
  output_cost_per_token?: number
  supports_function_calling?: boolean
  supports_parallel_function_calling?: boolean
  supports_vision?: boolean
  supports_reasoning?: boolean
  supports_prompt_caching?: boolean
  supports_response_schema?: boolean
  supports_pdf_input?: boolean
  supports_audio_input?: boolean
  supports_audio_output?: boolean
  supports_tool_choice?: boolean
  supports_system_messages?: boolean
  supports_web_search?: boolean
  cache_creation_input_token_cost?: number
  cache_read_input_token_cost?: number
  deprecation_date?: string
  source?: string
}

export type UpstreamRegistry = Record<string, UpstreamModel>

/**
 * 转换后的模型信息（用于 UI 展示和自动填充）
 */
export interface ModelInfo {
  /** 原始模型 ID */
  id: string
  /** 显示名称 */
  displayName: string
  /** 服务商 ID */
  provider: string
  /** 服务商显示名称 */
  providerName: string
  /** 模型类型 */
  mode: string
  /** 上下文窗口大小 */
  maxContextTokens: number
  /** 最大输出 tokens */
  maxOutputTokens: number
  /** 输入价格（$/1M tokens） */
  inputPricePerMillion: number
  /** 输出价格（$/1M tokens） */
  outputPricePerMillion: number
  /** 能力标签 */
  capabilities: ModelCapabilities
  /** 是否已废弃 */
  deprecated: boolean
  /** 废弃日期 */
  deprecationDate?: string
}

export interface ModelCapabilities {
  vision: boolean
  tools: boolean
  reasoning: boolean
  json: boolean
  audio: boolean
  pdf: boolean
}

/**
 * 服务商信息
 */
export interface ProviderInfo {
  id: string
  name: string
  modelCount: number
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 搜索关键词 */
  query: string
  /** 限制返回数量 */
  limit?: number
  /** 按服务商筛选 */
  provider?: string
  /** 按模式筛选 */
  mode?: 'chat' | 'embedding' | 'image_generation'
  /** 是否包含已废弃模型 */
  includeDeprecated?: boolean
}

/**
 * 同步元数据
 */
export interface SyncMeta {
  syncedAt: string
  modelCount: number
  providerCount: number
  source: string
}
