/**
 * Models API
 */
import { adminApi } from '../../lib/api';
import type {
  AiModel,
  ModelsResponse,
  CreateModelRequest,
  UpdateModelRequest,
} from '../../types/api';
import { buildModelsListPath } from './query-paths';

export const modelsApi = {
  /** 获取所有 Model */
  getAll: (providerId?: string) => adminApi.get<ModelsResponse>(buildModelsListPath(providerId)),

  /** 获取单个 Model */
  getById: (id: string) => adminApi.get<{ model: AiModel }>(`/ai/models/${id}`),

  /** 创建 Model */
  create: (data: CreateModelRequest) => adminApi.post<{ model: AiModel }>('/ai/models', data),

  /** 更新 Model */
  update: (id: string, data: UpdateModelRequest) =>
    adminApi.put<{ model: AiModel }>(`/ai/models/${id}`, data),

  /** 删除 Model */
  delete: (id: string) => adminApi.delete<void>(`/ai/models/${id}`),
};

export type { AiModel, CreateModelRequest, UpdateModelRequest };
