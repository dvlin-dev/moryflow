/**
 * Webhooks 常量
 */
import type { WebhookEvent } from './types'

/** 可用的 Webhook 事件 */
export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'screenshot.completed', label: 'Screenshot Completed' },
  { value: 'screenshot.failed', label: 'Screenshot Failed' },
]

/** 默认选中的事件 */
export const DEFAULT_WEBHOOK_EVENTS: WebhookEvent[] = [
  'screenshot.completed',
  'screenshot.failed',
]

/** 每个用户最多可创建的 Webhook 数量 */
export const MAX_WEBHOOKS_PER_USER = 10
