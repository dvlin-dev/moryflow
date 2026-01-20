/**
 * [PROVIDES]: Admin LLM API calls
 * [DEPENDS]: lib/api-client, lib/api-paths
 * [POS]: LLM Providers/Models/Settings 管理接口封装（Admin）
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
 */

import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  LlmSettings,
  LlmProviderListItem,
  LlmModelListItem,
  CreateLlmProviderInput,
  UpdateLlmProviderInput,
  CreateLlmModelInput,
  UpdateLlmModelInput,
  UpdateLlmSettingsInput,
} from './types';

export const llmApi = {
  getSettings(): Promise<LlmSettings> {
    return apiClient.get(ADMIN_API.LLM_SETTINGS);
  },
  updateSettings(input: UpdateLlmSettingsInput): Promise<LlmSettings> {
    return apiClient.put(ADMIN_API.LLM_SETTINGS, input);
  },

  listProviders(): Promise<LlmProviderListItem[]> {
    return apiClient.get(ADMIN_API.LLM_PROVIDERS);
  },
  createProvider(input: CreateLlmProviderInput): Promise<LlmProviderListItem> {
    return apiClient.post(ADMIN_API.LLM_PROVIDERS, input);
  },
  updateProvider(providerId: string, input: UpdateLlmProviderInput): Promise<LlmProviderListItem> {
    return apiClient.patch(`${ADMIN_API.LLM_PROVIDERS}/${providerId}`, input);
  },
  deleteProvider(providerId: string): Promise<void> {
    return apiClient.delete(`${ADMIN_API.LLM_PROVIDERS}/${providerId}`);
  },

  listModels(): Promise<LlmModelListItem[]> {
    return apiClient.get(ADMIN_API.LLM_MODELS);
  },
  createModel(input: CreateLlmModelInput): Promise<LlmModelListItem> {
    return apiClient.post(ADMIN_API.LLM_MODELS, input);
  },
  updateModel(llmModelId: string, input: UpdateLlmModelInput): Promise<LlmModelListItem> {
    return apiClient.patch(`${ADMIN_API.LLM_MODELS}/${llmModelId}`, input);
  },
  deleteModel(llmModelId: string): Promise<void> {
    return apiClient.delete(`${ADMIN_API.LLM_MODELS}/${llmModelId}`);
  },
};
