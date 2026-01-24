/**
 * Memox API 调用（Mem0 对齐）
 *
 * 仅使用公开 API（API Key 认证）
 */
import { MEMOX_API } from '@/lib/api-paths';
import { ApiKeyClient } from '@/features/playground-shared/api-key-client';
import type {
  MemoriesQueryParams,
  EntitiesQueryParams,
  EntityType,
  GraphData,
  GraphQueryParams,
  CreateMemoryRequest,
  SearchMemoryRequest,
  Memory,
  MemorySearchResult,
  Entity,
  CreateMemoryResponse,
} from './types';

function buildMemoryQuery(params?: MemoriesQueryParams): string {
  const searchParams = new URLSearchParams();
  if (!params) return '';

  if (params.user_id) searchParams.set('user_id', params.user_id);
  if (params.agent_id) searchParams.set('agent_id', params.agent_id);
  if (params.app_id) searchParams.set('app_id', params.app_id);
  if (params.run_id) searchParams.set('run_id', params.run_id);
  if (params.org_id) searchParams.set('org_id', params.org_id);
  if (params.project_id) searchParams.set('project_id', params.project_id);
  if (params.keywords) searchParams.set('keywords', params.keywords);
  if (params.filters) searchParams.set('filters', params.filters);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.categories?.length) {
    params.categories.forEach((category) => searchParams.append('categories', category));
  }

  return searchParams.toString();
}

function normalizeResults<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'results' in result) {
    const wrapped = (result as { results?: T[] }).results;
    return Array.isArray(wrapped) ? wrapped : [];
  }
  return [];
}

function buildGraphFromMemories(memories: Memory[]): GraphData {
  const nodes = new Map<string, { id: string; type?: string; name?: string }>();
  const edges: { id: string; sourceId: string; targetId: string; type?: string }[] = [];

  memories.forEach((memory) => {
    const entities = Array.isArray(memory.entities) ? memory.entities : [];
    entities.forEach((entity) => {
      const id = entity.id || entity.name || '';
      if (!id) return;
      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          name: entity.name || id,
          type: entity.type,
        });
      }
    });

    const relations = Array.isArray(memory.relations) ? memory.relations : [];
    relations.forEach((relation) => {
      const sourceId = relation.source || '';
      const targetId = relation.target || '';
      if (!sourceId || !targetId) return;

      if (!nodes.has(sourceId)) {
        nodes.set(sourceId, { id: sourceId, name: sourceId });
      }
      if (!nodes.has(targetId)) {
        nodes.set(targetId, { id: targetId, name: targetId });
      }

      edges.push({
        id: `${sourceId}-${targetId}-${relation.relation ?? 'rel'}`,
        sourceId,
        targetId,
        type: relation.relation,
      });
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

// ========== Memories API ==========

export async function fetchMemories(
  apiKey: string,
  params?: MemoriesQueryParams
): Promise<Memory[]> {
  const client = new ApiKeyClient({ apiKey });
  const query = buildMemoryQuery(params);
  const url = query ? `${MEMOX_API.MEMORIES}?${query}` : MEMOX_API.MEMORIES;
  return client.get<Memory[]>(url);
}

// ========== Entities API ==========

export async function fetchEntities(
  apiKey: string,
  params?: EntitiesQueryParams
): Promise<Entity[]> {
  const client = new ApiKeyClient({ apiKey });
  const searchParams = new URLSearchParams();
  if (params?.org_id) searchParams.set('org_id', params.org_id);
  if (params?.project_id) searchParams.set('project_id', params.project_id);

  const query = searchParams.toString();
  const url = query ? `${MEMOX_API.ENTITIES}?${query}` : MEMOX_API.ENTITIES;
  return client.get<Entity[]>(url);
}

export async function fetchEntityTypes(apiKey: string): Promise<EntityType[]> {
  const client = new ApiKeyClient({ apiKey });
  return client.get<EntityType[]>(MEMOX_API.ENTITY_FILTERS);
}

// ========== Graph API (from memories) ==========

export async function fetchGraph(apiKey: string, params: GraphQueryParams): Promise<GraphData> {
  const memories = await fetchMemories(apiKey, {
    user_id: params.user_id,
    agent_id: params.agent_id,
    app_id: params.app_id,
    run_id: params.run_id,
    page: 1,
    page_size: params.limit ?? 200,
  });

  return buildGraphFromMemories(memories);
}

// ========== Memory Playground API (API Key 认证) ==========

export async function createMemory(
  apiKey: string,
  data: CreateMemoryRequest
): Promise<CreateMemoryResponse> {
  const client = new ApiKeyClient({ apiKey });
  const result = await client.post<unknown>(MEMOX_API.MEMORIES, data);
  return Array.isArray(result)
    ? { results: result as CreateMemoryResponse['results'] }
    : (result as CreateMemoryResponse);
}

export async function searchMemories(
  apiKey: string,
  data: SearchMemoryRequest
): Promise<MemorySearchResult[]> {
  const client = new ApiKeyClient({ apiKey });
  const result = await client.post<unknown>(MEMOX_API.MEMORIES_SEARCH, data);
  return normalizeResults<MemorySearchResult>(result);
}

export async function getMemory(apiKey: string, id: string): Promise<Memory> {
  const client = new ApiKeyClient({ apiKey });
  return client.get<Memory>(`${MEMOX_API.MEMORIES}/${id}`);
}

export async function deleteMemory(apiKey: string, id: string): Promise<void> {
  const client = new ApiKeyClient({ apiKey });
  await client.request(`${MEMOX_API.MEMORIES}/${id}`, { method: 'DELETE' });
}

export async function exportMemories(apiKey: string, payload: Record<string, unknown>) {
  const client = new ApiKeyClient({ apiKey });
  const createResult = await client.post<{ id: string }>(MEMOX_API.EXPORTS, payload);
  const exportData = await client.post<Record<string, unknown>>(MEMOX_API.EXPORTS_GET, {
    memory_export_id: createResult.id,
  });

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });

  return blob;
}
