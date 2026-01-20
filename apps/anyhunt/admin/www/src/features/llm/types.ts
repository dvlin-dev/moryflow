/**
 * LLM Admin 类型定义
 */

export type LlmProviderType = 'openai' | 'openai_compatible' | 'openrouter';

export type LlmSettings = {
  id: string;
  defaultAgentModelId: string;
  defaultExtractModelId: string;
  createdAt: string;
  updatedAt: string;
};

export type LlmProviderListItem = {
  id: string;
  providerType: LlmProviderType;
  name: string;
  baseUrl: string | null;
  enabled: boolean;
  sortOrder: number;
  apiKeyStatus: 'set' | 'unset';
  createdAt: string;
  updatedAt: string;
};

export type LlmModelListItem = {
  id: string;
  providerId: string;
  providerName: string;
  providerType: LlmProviderType;
  modelId: string;
  upstreamId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateLlmProviderInput = {
  providerType: LlmProviderType;
  name: string;
  apiKey: string;
  baseUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
};

export type UpdateLlmProviderInput = {
  name?: string;
  apiKey?: string;
  baseUrl?: string | null;
  enabled?: boolean;
  sortOrder?: number;
};

export type CreateLlmModelInput = {
  providerId: string;
  modelId: string;
  upstreamId: string;
  enabled?: boolean;
};

export type UpdateLlmModelInput = {
  modelId?: string;
  upstreamId?: string;
  enabled?: boolean;
};

export type UpdateLlmSettingsInput = {
  defaultAgentModelId: string;
  defaultExtractModelId: string;
};
