/**
 * Webhooks 类型定义
 */

/** Webhook 事件类型 */
export type WebhookEvent = 'memory.created' | 'memory.updated' | 'memory.deleted'

/** Webhook 列表项 */
export interface Webhook {
  id: string
  name: string
  url: string
  secretPreview: string
  events: WebhookEvent[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** 创建 Webhook 请求 */
export interface CreateWebhookRequest {
  name: string
  url: string
  events?: WebhookEvent[]
}

/** 更新 Webhook 请求 */
export interface UpdateWebhookRequest {
  name?: string
  url?: string
  events?: WebhookEvent[]
  isActive?: boolean
}

/** Webhook 投递日志 */
export interface WebhookDelivery {
  id: string
  webhookId: string
  webhookName?: string
  event: string
  statusCode: number | null
  success: boolean
  error: string | null
  attempts: number
  latencyMs: number | null
  createdAt: string
  deliveredAt: string | null
}

/** 投递日志查询参数 */
export interface ListDeliveriesParams {
  webhookId?: string
  limit?: number
  offset?: number
}

/** 投递日志响应 */
export interface ListDeliveriesResponse {
  deliveries: WebhookDelivery[]
  total: number
}
