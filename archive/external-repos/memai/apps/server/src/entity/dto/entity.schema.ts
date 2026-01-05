/**
 * Entity module Zod schemas
 *
 * [DEFINES]: CreateEntitySchema, EntitySchema, etc.
 * [USED_BY]: entity.controller.ts, entity.service.ts
 */
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ========== Field Schemas ==========

const UserIdSchema = z.string().min(1, 'userId is required');

const EntityTypeSchema = z.string().min(1, 'type is required');

const EntityNameSchema = z.string().min(1, 'name is required');

const PropertiesSchema = z.record(z.string(), z.unknown()).optional();

const ConfidenceSchema = z.number().min(0).max(1).optional();

// ========== Request Schemas ==========

export const CreateEntitySchema = z.object({
  userId: UserIdSchema,
  type: EntityTypeSchema,
  name: EntityNameSchema,
  properties: PropertiesSchema,
  confidence: ConfidenceSchema,
});

export const CreateEntityBatchSchema = z.array(CreateEntitySchema);

export const ListEntityQuerySchema = z.object({
  userId: UserIdSchema,
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ========== Response Schemas ==========

export const EntitySchema = z.object({
  id: z.string(),
  apiKeyId: z.string(),
  userId: z.string(),
  type: z.string(),
  name: z.string(),
  properties: z.record(z.string(), z.unknown()).nullable(),
  confidence: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ========== Inferred Types ==========

export type CreateEntityInput = z.infer<typeof CreateEntitySchema>;
export type ListEntityQuery = z.infer<typeof ListEntityQuerySchema>;
export type EntityResponse = z.infer<typeof EntitySchema>;

// ========== DTO Classes ==========

export class CreateEntityDto extends createZodDto(CreateEntitySchema) {}
export class CreateEntityBatchDto extends createZodDto(CreateEntityBatchSchema) {}
export class ListEntityQueryDto extends createZodDto(ListEntityQuerySchema) {}
