/**
 * 创建 Webhook DTO
 */

import { z } from 'zod';
import { VALID_WEBHOOK_EVENTS } from '../webhook.constants';

export const createWebhookSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  url: z
    .string()
    .url('Invalid URL format')
    .max(500, 'URL cannot exceed 500 characters'),
  events: z
    .array(z.enum(VALID_WEBHOOK_EVENTS))
    .min(1, 'At least one event is required')
    .optional()
    .default(['screenshot.completed', 'screenshot.failed']),
});

export type CreateWebhookDto = z.infer<typeof createWebhookSchema>;
