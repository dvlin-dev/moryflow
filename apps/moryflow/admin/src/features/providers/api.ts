/**
 * Providers API
 */
import { adminApi } from '../../lib/api';
import type {
  AiProvider,
  PresetProvider,
  ProvidersResponse,
  PresetProvidersResponse,
  CreateProviderRequest,
  UpdateProviderRequest,
} from '../../types/api';

export const providersApi = {
  /** 获取预设 Provider 列表 */
  getPresets: () => adminApi.get<PresetProvidersResponse>('/ai/preset-providers'),

  /** 获取所有 Provider */
  getAll: () => adminApi.get<ProvidersResponse>('/ai/providers'),

  /** 获取单个 Provider */
  getById: (id: string) => adminApi.get<{ provider: AiProvider }>(`/ai/providers/${id}`),

  /** 创建 Provider */
  create: (data: CreateProviderRequest) =>
    adminApi.post<{ provider: AiProvider }>('/ai/providers', data),

  /** 更新 Provider */
  update: (id: string, data: UpdateProviderRequest) =>
    adminApi.put<{ provider: AiProvider }>(`/ai/providers/${id}`, data),

  /** 删除 Provider */
  delete: (id: string) => adminApi.delete<void>(`/ai/providers/${id}`),
};

export type { AiProvider, PresetProvider, CreateProviderRequest, UpdateProviderRequest };
