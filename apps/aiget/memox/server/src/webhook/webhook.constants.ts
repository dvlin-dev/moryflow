/**
 * Webhook 常量
 */

export const VALID_WEBHOOK_EVENTS = [
  'memory.created',
  'memory.updated',
  'memory.deleted',
] as const;

export type WebhookEvent = (typeof VALID_WEBHOOK_EVENTS)[number];

export const MAX_WEBHOOKS_PER_USER = 10;
