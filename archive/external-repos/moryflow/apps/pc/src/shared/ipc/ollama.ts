/**
 * Ollama IPC 类型定义
 */

import type { ModelCapabilities, ModelModalities, ModelLimits } from '../model-registry/index.js'

/** 连接检测结果 */
export interface OllamaConnectionResult {
  connected: boolean
  version?: string
  error?: string
}

/** 本地模型信息 */
export interface OllamaLocalModel {
  id: string
  name: string
  size: number
  modifiedAt: string
  capabilities: ModelCapabilities
  modalities: ModelModalities
  limits: ModelLimits
  details: {
    parent_model?: string
    format: string
    family: string
    families?: string[]
    parameter_size: string
    quantization_level: string
  }
}

/** 下载进度事件 */
export interface OllamaPullProgressEvent {
  modelName: string
  status: string
  digest?: string
  total?: number
  completed?: number
}

/** Ollama 操作结果 */
export interface OllamaOperationResult {
  success: boolean
  error?: string
}

/** 模型库中的模型信息 */
export interface OllamaLibraryModel {
  /** 模型标识符 */
  model_identifier: string
  /** 命名空间 */
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
