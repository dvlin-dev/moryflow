/**
 * Webhooks API
 */
import { ApiKeyClient } from '@/features/playground-shared/api-key-client';
import { WEBHOOK_API } from '@/lib/api-paths';
import type { Webhook, CreateWebhookRequest, UpdateWebhookRequest } from './types';

/** 获取 Webhook 列表 */
export async function getWebhooks(apiKey: string): Promise<Webhook[]> {
  const client = new ApiKeyClient({ apiKey });
  return client.get<Webhook[]>(WEBHOOK_API.WEBHOOKS);
}

/** 创建 Webhook */
export async function createWebhook(apiKey: string, data: CreateWebhookRequest): Promise<Webhook> {
  const client = new ApiKeyClient({ apiKey });
  return client.post<Webhook>(WEBHOOK_API.WEBHOOKS, data);
}

/** 更新 Webhook */
export async function updateWebhook(
  apiKey: string,
  id: string,
  data: UpdateWebhookRequest
): Promise<Webhook> {
  const client = new ApiKeyClient({ apiKey });
  return client.patch<Webhook>(`${WEBHOOK_API.WEBHOOKS}/${id}`, data);
}

/** 删除 Webhook */
export async function deleteWebhook(apiKey: string, id: string): Promise<void> {
  const client = new ApiKeyClient({ apiKey });
  await client.delete(`${WEBHOOK_API.WEBHOOKS}/${id}`);
}

/** 重新生成 Secret */
export async function regenerateWebhookSecret(apiKey: string, id: string): Promise<Webhook> {
  const client = new ApiKeyClient({ apiKey });
  return client.post<Webhook>(`${WEBHOOK_API.WEBHOOKS}/${id}/regenerate-secret`);
}
