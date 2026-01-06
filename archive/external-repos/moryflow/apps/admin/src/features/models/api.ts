/**
 * Models API
 */
import { adminApi } from '../../lib/api'
import type {
  AiModel,
  ModelsResponse,
  CreateModelRequest,
  UpdateModelRequest,
} from '../../types/api'

export const modelsApi = {
  /** 获取所有 Model */
  getAll: (providerId?: string) => {
    const query = providerId ? `?providerId=${providerId}` : ''
    return adminApi.get<ModelsResponse>(`/ai/models${query}`)
  },

  /** 获取单个 Model */
  getById: (id: string) => adminApi.get<{ model: AiModel }>(`/ai/models/${id}`),

  /** 创建 Model */
  create: (data: CreateModelRequest) =>
    adminApi.post<{ model: AiModel }>('/ai/models', data),

  /** 更新 Model */
  update: (id: string, data: UpdateModelRequest) =>
    adminApi.put<{ model: AiModel }>(`/ai/models/${id}`, data),

  /** 删除 Model */
  delete: (id: string) => adminApi.delete<{ success: boolean }>(`/ai/models/${id}`),
}

export type { AiModel, CreateModelRequest, UpdateModelRequest }
