/**
 * Memox React Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMemories,
  exportMemories,
  fetchEntities,
  fetchEntityTypes,
  deleteEntity,
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
  memories: () => [...memoxKeys.all, 'memories'] as const,
  memoriesList: (params?: MemoriesQueryParams) => [...memoxKeys.memories(), params] as const,
  entities: () => [...memoxKeys.all, 'entities'] as const,
  entitiesList: (params?: EntitiesQueryParams) => [...memoxKeys.entities(), params] as const,
  entityTypes: () => [...memoxKeys.entities(), 'types'] as const,
  graph: (apiKey: string, params: GraphQueryParams) =>
    [...memoxKeys.all, 'graph', apiKey, params] as const,
};

// ========== Memories Hooks ==========

export function useMemories(params?: MemoriesQueryParams) {
  return useQuery({
    queryKey: memoxKeys.memoriesList(params),
    queryFn: () => fetchMemories(params),
  });
}

export function useExportMemories() {
  return useMutation({
    mutationFn: exportMemories,
  });
}

// ========== Entities Hooks ==========

export function useEntities(params?: EntitiesQueryParams) {
  return useQuery({
    queryKey: memoxKeys.entitiesList(params),
    queryFn: () => fetchEntities(params),
  });
}

export function useEntityTypes() {
  return useQuery({
    queryKey: memoxKeys.entityTypes(),
    queryFn: fetchEntityTypes,
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoxKeys.entities() });
    },
  });
}

// ========== Graph Hooks (API Key 认证) ==========

export function useGraph(apiKey: string, params: GraphQueryParams, enabled = true) {
  return useQuery({
    queryKey: memoxKeys.graph(apiKey, params),
    queryFn: () => fetchGraph(apiKey, params),
    enabled: enabled && !!apiKey && !!params.userId,
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
  return useMutation({
    mutationFn: ({ apiKey, id }: { apiKey: string; id: string }) => deleteMemory(apiKey, id),
  });
}
