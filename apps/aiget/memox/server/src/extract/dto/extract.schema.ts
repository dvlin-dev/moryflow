/**
 * Extract module Zod schemas
 *
 * [DEFINES]: ExtractSchema, ExtractBatchSchema
 * [USED_BY]: extract.controller.ts
 */
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ========== Shared Field Schemas ==========

const EntityTypesSchema = z.array(z.string()).optional();
const RelationTypesSchema = z.array(z.string()).optional();
const MinConfidenceSchema = z.number().min(0).max(1).optional();

// ========== Request Schemas ==========

export const ExtractSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  userId: z.string().min(1, 'userId is required'),
  entityTypes: EntityTypesSchema,
  relationTypes: RelationTypesSchema,
  minConfidence: MinConfidenceSchema,
  saveToGraph: z.boolean().optional().default(true),
});

export const ExtractBatchSchema = z.object({
  texts: z.array(z.string().min(1)).min(1, 'At least one text is required'),
  userId: z.string().min(1, 'userId is required'),
  entityTypes: EntityTypesSchema,
  relationTypes: RelationTypesSchema,
  minConfidence: MinConfidenceSchema,
  saveToGraph: z.boolean().optional().default(true),
});

// ========== DTO Classes ==========

export class ExtractDto extends createZodDto(ExtractSchema) {}
export class ExtractBatchDto extends createZodDto(ExtractBatchSchema) {}
