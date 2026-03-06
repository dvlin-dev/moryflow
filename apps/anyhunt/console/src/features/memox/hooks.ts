/**
 * Memox React Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMemories,
  exportMemories,
  fetchEntities,
  fetchEntityTypes,
  fetchGraph,
  createMemory,
  searchMemories,
  deleteMemory,
} from './api';
import type {
  MemoriesQueryParams,
  EntitiesQueryParams,
  GraphQueryParams,
  CreateMemoryRequest,
  SearchMemoryRequest,
} from './types';

// ========== Query Keys ==========

export const memoxKeys = {
  all: ['memox'] as const,
  memories: (apiKey: string) => [...memoxKeys.all, 'memories', apiKey] as const,
  memoriesList: (apiKey: string, params?: MemoriesQueryParams) =>
    [...memoxKeys.memories(apiKey), params] as const,
  entities: (apiKey: string) => [...memoxKeys.all, 'entities', apiKey] as const,
  entitiesList: (apiKey: string, params?: EntitiesQueryParams) =>
    [...memoxKeys.entities(apiKey), params] as const,
  entityTypes: (apiKey: string) => [...memoxKeys.entities(apiKey), 'types'] as const,
  graph: (apiKey: string, params: GraphQueryParams) =>
    [...memoxKeys.all, 'graph', apiKey, params] as const,
};

// ========== Memories Hooks ==========

export function useMemories(apiKey: string, params?: MemoriesQueryParams, enabled = true) {
  return useQuery({
    queryKey: memoxKeys.memoriesList(apiKey, params),
    queryFn: () => fetchMemories(apiKey, params),
    enabled: enabled && !!apiKey,
  });
}

export function useExportMemories() {
  return useMutation({
    mutationFn: ({ apiKey, payload }: { apiKey: string; payload: Record<string, unknown> }) =>
      exportMemories(apiKey, payload),
  });
}

// ========== Entities Hooks ==========

export function useEntities(apiKey: string, params?: EntitiesQueryParams) {
  return useQuery({
    queryKey: memoxKeys.entitiesList(apiKey, params),
    queryFn: () => fetchEntities(apiKey, params),
    enabled: !!apiKey,
  });
}

export function useEntityTypes(apiKey: string) {
  return useQuery({
    queryKey: memoxKeys.entityTypes(apiKey),
    queryFn: () => fetchEntityTypes(apiKey),
    enabled: !!apiKey,
  });
}

// ========== Graph Hooks (API Key 认证) ==========

export function useGraph(apiKey: string, params: GraphQueryParams, enabled = true) {
  const hasFilter = Boolean(params.user_id || params.agent_id || params.app_id || params.run_id);

  return useQuery({
    queryKey: memoxKeys.graph(apiKey, params),
    queryFn: () => fetchGraph(apiKey, params),
    enabled: enabled && !!apiKey && hasFilter,
  });
}

// ========== Memory Playground Hooks (API Key 认证) ==========

export function useCreateMemory() {
  return useMutation({
    mutationFn: ({ apiKey, data }: { apiKey: string; data: CreateMemoryRequest }) =>
      createMemory(apiKey, data),
  });
}

export function useSearchMemories() {
  return useMutation({
    mutationFn: ({ apiKey, data }: { apiKey: string; data: SearchMemoryRequest }) =>
      searchMemories(apiKey, data),
  });
}

export function useDeleteMemoryWithApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ apiKey, id }: { apiKey: string; id: string }) => deleteMemory(apiKey, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memoxKeys.memories(variables.apiKey),
      });
    },
  });
}
