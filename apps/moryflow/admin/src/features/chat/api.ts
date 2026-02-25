/**
 * 聊天功能 API
 */
import { adminApi } from '@/lib/api';
import { apiClient } from '@/lib/api-client';
import { AI_PROXY_API } from '@/lib/api-paths';
import type { ModelGroup, ModelOption } from './types';
import type { ModelsResponse, ProvidersResponse } from '@/types/api';

/**
 * 获取可用模型列表
 * 使用 admin API 获取已配置的模型
 */
export async function fetchModels(): Promise<ModelGroup[]> {
  // 获取模型和提供商列表
  const [modelsRes, providersRes] = await Promise.all([
    adminApi.get<ModelsResponse>('/ai/models'),
    adminApi.get<ProvidersResponse>('/ai/providers'),
  ]);

  const models = modelsRes?.models ?? [];
  const providers = providersRes?.providers ?? [];

  // 创建 providerId -> providerName 映射
  const providerMap = new Map<string, string>();
  for (const provider of providers) {
    providerMap.set(provider.id, provider.name);
  }

  // 只保留启用的模型
  const enabledModels = models.filter((m) => m.enabled);

  if (enabledModels.length === 0) {
    return [];
  }

  // 按 provider 分组
  const groups: Record<string, ModelOption[]> = {};

  for (const model of enabledModels) {
    const providerName = providerMap.get(model.providerId) || 'unknown';
    if (!groups[providerName]) {
      groups[providerName] = [];
    }
    groups[providerName].push({
      id: model.modelId, // 使用 modelId 作为调用 API 的模型 ID（不是 upstreamId）
      name: model.displayName,
      provider: providerName,
      maxContextTokens: model.maxContextTokens,
    });
  }

  // 转换为 ModelGroup 数组
  return Object.entries(groups).map(([label, options]) => ({
    label,
    options,
  }));
}

export interface ChatCompletionMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionStreamRequest {
  model: string;
  messages: ChatCompletionMessage[];
  stream: true;
}

export async function createChatCompletionStream(
  request: ChatCompletionStreamRequest,
  signal?: AbortSignal
): Promise<Response> {
  return apiClient.stream(AI_PROXY_API.CHAT_COMPLETIONS, {
    method: 'POST',
    body: request,
    signal,
  });
}
