/**
 * [PROVIDES]: Admin LLM React Query hooks
 * [DEPENDS]: @tanstack/react-query, llm/api
 * [POS]: LLM Providers/Models/Settings 的查询与变更（带缓存失效）
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { llmApi } from './api';
import type {
  CreateLlmProviderInput,
  UpdateLlmProviderInput,
  CreateLlmModelInput,
  UpdateLlmModelInput,
  UpdateLlmSettingsInput,
} from './types';

const llmKeys = {
  root: ['admin', 'llm'] as const,
  settings: () => [...llmKeys.root, 'settings'] as const,
  providers: () => [...llmKeys.root, 'providers'] as const,
  providerPresets: () => [...llmKeys.root, 'provider-presets'] as const,
  models: () => [...llmKeys.root, 'models'] as const,
};

export function useAdminLlmSettings() {
  return useQuery({
    queryKey: llmKeys.settings(),
    queryFn: () => llmApi.getSettings(),
  });
}

export function useUpdateAdminLlmSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLlmSettingsInput) => llmApi.updateSettings(input),
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: llmKeys.settings() })]);
    },
  });
}

export function useAdminLlmProviders() {
  return useQuery({
    queryKey: llmKeys.providers(),
    queryFn: () => llmApi.listProviders(),
  });
}

export function useAdminLlmProviderPresets() {
  return useQuery({
    queryKey: llmKeys.providerPresets(),
    queryFn: () => llmApi.listPresetProviders(),
  });
}

export function useCreateAdminLlmProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLlmProviderInput) => llmApi.createProvider(input),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: llmKeys.providers() }),
        qc.invalidateQueries({ queryKey: llmKeys.models() }),
      ]);
    },
  });
}

export function useUpdateAdminLlmProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { providerId: string; input: UpdateLlmProviderInput }) =>
      llmApi.updateProvider(params.providerId, params.input),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: llmKeys.providers() }),
        qc.invalidateQueries({ queryKey: llmKeys.models() }),
        qc.invalidateQueries({ queryKey: llmKeys.settings() }),
      ]);
    },
  });
}

export function useDeleteAdminLlmProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => llmApi.deleteProvider(providerId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: llmKeys.providers() }),
        qc.invalidateQueries({ queryKey: llmKeys.models() }),
        qc.invalidateQueries({ queryKey: llmKeys.settings() }),
      ]);
    },
  });
}

export function useAdminLlmModels() {
  return useQuery({
    queryKey: llmKeys.models(),
    queryFn: () => llmApi.listModels(),
  });
}

export function useCreateAdminLlmModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLlmModelInput) => llmApi.createModel(input),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: llmKeys.models() }),
        qc.invalidateQueries({ queryKey: llmKeys.settings() }),
      ]);
    },
  });
}

export function useUpdateAdminLlmModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { llmModelId: string; input: UpdateLlmModelInput }) =>
      llmApi.updateModel(params.llmModelId, params.input),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: llmKeys.models() }),
        qc.invalidateQueries({ queryKey: llmKeys.settings() }),
      ]);
    },
  });
}

export function useDeleteAdminLlmModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (llmModelId: string) => llmApi.deleteModel(llmModelId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: llmKeys.models() }),
        qc.invalidateQueries({ queryKey: llmKeys.settings() }),
      ]);
    },
  });
}
