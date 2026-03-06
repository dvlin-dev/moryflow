/**
 * [DEFINES]: Admin LLM Provider/Model/Settings 类型
 * [USED_BY]: features/llm/*, pages/llm/*
 * [POS]: LLM 管理页面的数据类型边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
 */

import type { SubscriptionTier } from '@/lib/types';

export type LlmProviderType = string;

export type LlmProviderPreset = {
  id: string;
  name: string;
  sdkType: string;
  defaultBaseUrl: string;
  docUrl?: string;
  description?: string;
};

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
  displayName: string;
  inputTokenPrice: number;
  outputTokenPrice: number;
  minTier: SubscriptionTier;
  maxContextTokens: number;
  maxOutputTokens: number;
  capabilitiesJson: Record<string, unknown> | string;
  sortOrder: number;
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
  displayName: string;
  enabled?: boolean;
  inputTokenPrice: number;
  outputTokenPrice: number;
  minTier: SubscriptionTier;
  maxContextTokens: number;
  maxOutputTokens: number;
  capabilities?: LlmModelCapabilities;
  reasoning?: ReasoningConfig;
  sortOrder?: number;
};

export type UpdateLlmModelInput = {
  modelId?: string;
  upstreamId?: string;
  displayName?: string;
  enabled?: boolean;
  inputTokenPrice?: number;
  outputTokenPrice?: number;
  minTier?: SubscriptionTier;
  maxContextTokens?: number;
  maxOutputTokens?: number;
  capabilities?: LlmModelCapabilities;
  reasoning?: ReasoningConfig;
  sortOrder?: number;
};

export type UpdateLlmSettingsInput = {
  defaultAgentModelId: string;
  defaultExtractModelId: string;
};

export type ReasoningConfig = {
  enabled: boolean;
  effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';
  maxTokens?: number;
  includeThoughts?: boolean;
  exclude?: boolean;
  rawConfig?: Record<string, unknown>;
};

export type LlmModelCapabilities = {
  vision?: boolean;
  tools?: boolean;
  json?: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  reasoning?: ReasoningConfig;
};
