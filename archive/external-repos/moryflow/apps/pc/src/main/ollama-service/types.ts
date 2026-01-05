/**
 * Ollama API 类型定义
 * 参考：https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import type { ModelCapabilities, ModelModalities, ModelLimits } from '../../shared/model-registry/index.js'

/** Ollama 本地模型信息（来自 /api/tags） */
export interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    parent_model?: string
    format: string
    family: string
    families?: string[]
    parameter_size: string
    quantization_level: string
  }
}

/** /api/tags 响应 */
export interface OllamaTagsResponse {
  models: OllamaModel[]
}

/** /api/version 响应 */
export interface OllamaVersionResponse {
  version: string
}

/** /api/pull 请求体 */
export interface OllamaPullRequest {
  name: string
  insecure?: boolean
  stream?: boolean
}

/** /api/pull 流式响应 */
export interface OllamaPullProgress {
  status: string
  digest?: string
  total?: number
  completed?: number
}

/** /api/delete 请求体 */
export interface OllamaDeleteRequest {
  name: string
}

/** /api/show 请求体 */
export interface OllamaShowRequest {
  name: string
}

/** /api/show 响应 */
export interface OllamaShowResponse {
  modelfile: string
  parameters: string
  template: string
  details: OllamaModel['details']
}

/** 转换后的本地模型信息（用于 Moryflow） */
export interface OllamaLocalModel {
  id: string
  name: string
  size: number
  modifiedAt: string
  capabilities: ModelCapabilities
  modalities: ModelModalities
  limits: ModelLimits
  details: OllamaModel['details']
}

/** 连接检测结果 */
export interface OllamaConnectionResult {
  connected: boolean
  version?: string
  error?: string
}

/** 模型下载状态 */
export type OllamaPullStatus =
  | { type: 'progress'; digest?: string; total?: number; completed?: number; status: string }
  | { type: 'success' }
  | { type: 'error'; error: string }

/** 模型库中的模型信息（来自 ollamadb.dev） */
export interface OllamaLibraryModel {
  /** 模型标识符 */
  model_identifier: string
  /** 命名空间（如 library） */
  namespace: string
  /** 模型名称 */
  name: string
  /** 描述 */
  description: string
  /** 下载次数 */
  pulls: number
  /** 标签数量 */
  tag_count: number
  /** 最后更新时间 */
  last_updated: string
  /** 能力标签 */
  capabilities: string[]
  /** 可用的参数大小 */
  sizes: string[]
}

/** 模型库搜索参数 */
export interface OllamaLibrarySearchParams {
  /** 搜索关键词 */
  search?: string
  /** 按能力筛选 */
  capability?: string
  /** 排序字段 */
  sortBy?: 'pulls' | 'last_updated'
  /** 排序顺序 */
  order?: 'asc' | 'desc'
  /** 返回数量 */
  limit?: number
}
