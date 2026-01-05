/**
 * Webhooks API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { Webhook, CreateWebhookRequest, UpdateWebhookRequest } from './types'

/** 获取 Webhook 列表 */
export async function getWebhooks(): Promise<Webhook[]> {
  return apiClient.get<Webhook[]>(CONSOLE_API.WEBHOOKS)
}

/** 创建 Webhook */
export async function createWebhook(data: CreateWebhookRequest): Promise<Webhook> {
  return apiClient.post<Webhook>(CONSOLE_API.WEBHOOKS, data)
}

/** 更新 Webhook */
export async function updateWebhook(
  id: string,
  data: UpdateWebhookRequest
): Promise<Webhook> {
  return apiClient.patch<Webhook>(`${CONSOLE_API.WEBHOOKS}/${id}`, data)
}

/** 删除 Webhook */
export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete(`${CONSOLE_API.WEBHOOKS}/${id}`)
}

/** 重新生成 Secret */
export async function regenerateWebhookSecret(id: string): Promise<Webhook> {
  return apiClient.post<Webhook>(`${CONSOLE_API.WEBHOOKS}/${id}/regenerate-secret`)
}
