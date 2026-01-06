/**
 * 更新 Webhook DTO
 */

import { z } from 'zod';
import { VALID_WEBHOOK_EVENTS } from '../webhook.constants';

export const updateWebhookSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  url: z
    .string()
    .url('Invalid URL format')
    .max(500, 'URL cannot exceed 500 characters')
    .optional(),
  events: z
    .array(z.enum(VALID_WEBHOOK_EVENTS))
    .min(1, 'At least one event is required')
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWebhookDto = z.infer<typeof updateWebhookSchema>;
