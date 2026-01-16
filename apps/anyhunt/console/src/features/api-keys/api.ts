/**
 * API Keys API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type {
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
} from './types'

/** 获取 API Key 列表 */
export async function getApiKeys(): Promise<ApiKey[]> {
  return apiClient.get<ApiKey[]>(CONSOLE_API.API_KEYS)
}

/** 获取单个 API Key */
export async function getApiKey(id: string): Promise<ApiKey> {
  return apiClient.get<ApiKey>(`${CONSOLE_API.API_KEYS}/${id}`)
}

/** 创建 API Key */
export async function createApiKey(
  data: CreateApiKeyRequest
): Promise<CreateApiKeyResponse> {
  return apiClient.post<CreateApiKeyResponse>(CONSOLE_API.API_KEYS, data)
}

/** 更新 API Key */
export async function updateApiKey(
  id: string,
  data: UpdateApiKeyRequest
): Promise<ApiKey> {
  return apiClient.patch<ApiKey>(`${CONSOLE_API.API_KEYS}/${id}`, data)
}

/** 删除 API Key */
export async function deleteApiKey(id: string): Promise<void> {
  await apiClient.delete(`${CONSOLE_API.API_KEYS}/${id}`)
}
