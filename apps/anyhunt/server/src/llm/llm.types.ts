/**
 * [DEFINES]: LLM module public types (Admin DTOs + runtime resolved route with ModelProvider)
 * [USED_BY]: agent.service.ts, llm-admin.service.ts
 * [POS]: LLM Provider/Model/Settings 的输出类型边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { LlmProviderType } from './dto';
import type { Model, ModelProvider } from '@openai/agents-core';

export type LlmProviderListItem = {
  id: string;
  providerType: LlmProviderType;
  name: string;
  baseUrl: string | null;
  enabled: boolean;
  sortOrder: number;
  apiKeyStatus: 'set';
  createdAt: Date;
  updatedAt: Date;
};

export type LlmModelListItem = {
  id: string;
  providerId: string;
  providerName: string;
  providerType: LlmProviderType;
  modelId: string;
  upstreamId: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LlmSettingsDto = {
  id: string;
  defaultAgentModelId: string;
  defaultExtractModelId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ResolvedLlmRoute = {
  requestedModelId: string;
  provider: {
    id: string;
    providerType: LlmProviderType;
    name: string;
    baseUrl: string | null;
  };
  upstreamModelId: string;
  modelProvider: ModelProvider;
  model: Model;
};
