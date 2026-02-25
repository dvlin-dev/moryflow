/**
 * [PROVIDES]: webhookFormSchema, webhook form defaults/types
 * [DEPENDS]: zod/v3, webhooks constants/types
 * [POS]: Webhook create/edit 表单校验规则（react-hook-form + zod）
 */
import { z } from 'zod/v3'
import { DEFAULT_WEBHOOK_EVENTS } from './constants'
import type { Webhook, WebhookEvent } from './types'

const webhookEventSchema = z.enum(['screenshot.completed', 'screenshot.failed'])

export const webhookFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  url: z
    .string()
    .trim()
    .url('Please enter a valid URL')
    .refine((value) => value.startsWith('https://'), 'Must be an HTTPS URL'),
  events: z.array(webhookEventSchema).min(1, 'Please select at least one event'),
})

export type WebhookFormValues = z.infer<typeof webhookFormSchema>

export function getWebhookFormDefaults(
  initial?: Pick<Webhook, 'name' | 'url' | 'events'>
): WebhookFormValues {
  return {
    name: initial?.name ?? '',
    url: initial?.url ?? '',
    events: initial?.events ?? DEFAULT_WEBHOOK_EVENTS,
  }
}

export function normalizeWebhookEvents(events: WebhookEvent[]): WebhookEvent[] {
  return Array.from(new Set(events))
}

