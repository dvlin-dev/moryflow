/**
 * Relation module Zod schemas
 *
 * [DEFINES]: CreateRelationSchema, RelationSchema, etc.
 * [USED_BY]: relation.controller.ts, relation.service.ts
 */
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ========== Field Schemas ==========

const UserIdSchema = z.string().min(1, 'userId is required');

const EntityIdSchema = z.string().min(1);

const RelationTypeSchema = z.string().min(1, 'type is required');

const PropertiesSchema = z.record(z.string(), z.unknown()).optional();

const ConfidenceSchema = z.number().min(0).max(1).optional();

// ========== Request Schemas ==========

export const CreateRelationSchema = z.object({
  userId: UserIdSchema,
  sourceId: EntityIdSchema,
  targetId: EntityIdSchema,
  type: RelationTypeSchema,
  properties: PropertiesSchema,
  confidence: ConfidenceSchema,
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
});

export const CreateRelationBatchSchema = z.array(CreateRelationSchema);

export const ListRelationQuerySchema = z.object({
  userId: UserIdSchema,
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ========== Response Schemas ==========

export const RelationSchema = z.object({
  id: z.string(),
  apiKeyId: z.string(),
  userId: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  type: z.string(),
  properties: z.record(z.string(), z.unknown()).nullable(),
  confidence: z.number().nullable(),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ========== Inferred Types ==========

export type CreateRelationInput = z.infer<typeof CreateRelationSchema>;
export type ListRelationQuery = z.infer<typeof ListRelationQuerySchema>;
export type RelationResponse = z.infer<typeof RelationSchema>;

// ========== DTO Classes ==========

export class CreateRelationDto extends createZodDto(CreateRelationSchema) {}
export class CreateRelationBatchDto extends createZodDto(CreateRelationBatchSchema) {}
export class ListRelationQueryDto extends createZodDto(ListRelationQuerySchema) {}
