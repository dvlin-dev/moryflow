/**
 * 聊天功能模块类型定义
 */

/** 模型选项 */
export interface ModelOption {
  id: string
  name: string
  provider: string
  maxContextTokens: number
}

/** 模型分组 */
export interface ModelGroup {
  label: string
  options: ModelOption[]
}

/** OpenAI 模型响应格式 */
export interface OpenAIModel {
  id: string
  object: string
  created: number
  owned_by: string
}

/** OpenAI 模型列表响应 */
export interface OpenAIModelListResponse {
  object: string
  data: OpenAIModel[]
}
