/**
 * Webhooks API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type {
  Webhook,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookDelivery,
  ListDeliveriesParams,
} from './types'

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

/** 获取所有投递日志 */
export async function getWebhookDeliveries(
  params: ListDeliveriesParams = {}
): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
  const searchParams = new URLSearchParams()

  if (params.webhookId) searchParams.set('webhookId', params.webhookId)
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit))
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  const url = query
    ? `${CONSOLE_API.WEBHOOKS}/deliveries?${query}`
    : `${CONSOLE_API.WEBHOOKS}/deliveries`

  const result = await apiClient.getPaginated<WebhookDelivery>(url)

  return {
    deliveries: result.data,
    total: result.meta.total,
  }
}
