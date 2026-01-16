/**
 * Memox API 调用
 *
 * 包含两类 API：
 * 1. Console API（Session 认证）- 用于 Console 管理页面
 * 2. Memox API（API Key 认证）- 用于 Playground 测试
 */
import { apiClient } from '@/lib/api-client';
import { MEMOX_CONSOLE_API, MEMOX_API } from '@/lib/api-paths';
import { ApiKeyClient } from '@/features/playground-shared/api-key-client';
import type {
  MemoriesResponse,
  MemoriesQueryParams,
  EntitiesResponse,
  EntitiesQueryParams,
  EntityType,
  GraphData,
  GraphQueryParams,
  CreateMemoryRequest,
  SearchMemoryRequest,
  Memory,
  MemorySearchResult,
} from './types';

// ========== Memories API ==========

export async function fetchMemories(params?: MemoriesQueryParams): Promise<MemoriesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  const url = query ? `${MEMOX_CONSOLE_API.MEMORIES}?${query}` : MEMOX_CONSOLE_API.MEMORIES;
  return apiClient.get<MemoriesResponse>(url);
}

export async function exportMemories(params?: {
  apiKeyId?: string;
  format?: 'json' | 'csv';
}): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId);
  if (params?.format) searchParams.set('format', params.format);

  const query = searchParams.toString();
  const url = query
    ? `${MEMOX_CONSOLE_API.MEMORIES}/export?${query}`
    : `${MEMOX_CONSOLE_API.MEMORIES}/export`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response.blob();
}

// ========== Entities API ==========

export async function fetchEntities(params?: EntitiesQueryParams): Promise<EntitiesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  const url = query ? `${MEMOX_CONSOLE_API.ENTITIES}?${query}` : MEMOX_CONSOLE_API.ENTITIES;
  return apiClient.get<EntitiesResponse>(url);
}

export async function fetchEntityTypes(): Promise<EntityType[]> {
  return apiClient.get<EntityType[]>(`${MEMOX_CONSOLE_API.ENTITIES}/types`);
}

export async function deleteEntity(id: string): Promise<void> {
  await apiClient.delete(`${MEMOX_CONSOLE_API.ENTITIES}/${id}`);
}

// ========== Graph API (API Key 认证) ==========

export async function fetchGraph(apiKey: string, params: GraphQueryParams): Promise<GraphData> {
  const client = new ApiKeyClient({ apiKey });
  const searchParams = new URLSearchParams();
  searchParams.set('userId', params.userId);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const url = `${MEMOX_API.GRAPH}?${searchParams.toString()}`;
  return client.get<GraphData>(url);
}

// ========== Memory Playground API (API Key 认证) ==========

export async function createMemory(apiKey: string, data: CreateMemoryRequest): Promise<Memory> {
  const client = new ApiKeyClient({ apiKey });
  return client.post<Memory>(MEMOX_API.MEMORIES, data);
}

export async function searchMemories(
  apiKey: string,
  data: SearchMemoryRequest
): Promise<MemorySearchResult[]> {
  const client = new ApiKeyClient({ apiKey });
  return client.post<MemorySearchResult[]>(MEMOX_API.MEMORIES_SEARCH, data);
}

export async function getMemory(apiKey: string, id: string): Promise<Memory> {
  const client = new ApiKeyClient({ apiKey });
  return client.get<Memory>(`${MEMOX_API.MEMORIES}/${id}`);
}

export async function deleteMemory(apiKey: string, id: string): Promise<void> {
  const client = new ApiKeyClient({ apiKey });
  await client.request(`${MEMOX_API.MEMORIES}/${id}`, { method: 'DELETE' });
}
