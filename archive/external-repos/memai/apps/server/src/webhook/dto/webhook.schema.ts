/**
 * Webhook module Zod schemas
 *
 * [DEFINES]: CreateWebhookSchema, UpdateWebhookSchema
 * [USED_BY]: webhook.controller.ts, webhook.service.ts
 */
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { VALID_WEBHOOK_EVENTS } from '../webhook.constants';

// ========== Request Schemas ==========

export const CreateWebhookSchema = z.object({
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
    .default(['memory.created']),
});

export const UpdateWebhookSchema = z.object({
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

export const ListDeliveriesQuerySchema = z.object({
  webhookId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ========== DTO Classes ==========

export class CreateWebhookDto extends createZodDto(CreateWebhookSchema) {}
export class UpdateWebhookDto extends createZodDto(UpdateWebhookSchema) {}
export class ListDeliveriesQueryDto extends createZodDto(ListDeliveriesQuerySchema) {}
