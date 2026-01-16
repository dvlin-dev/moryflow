/**
 * Graph module Zod schemas
 *
 * [DEFINES]: TraverseSchema, GetGraphQuerySchema, PathQuerySchema, NeighborsQuerySchema
 * [USED_BY]: graph.controller.ts
 */
import { z } from 'zod';

// ========== Query Schemas ==========

export const GetGraphQuerySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

export const PathQuerySchema = z.object({
  sourceId: z.string().min(1, 'sourceId is required'),
  targetId: z.string().min(1, 'targetId is required'),
  maxDepth: z.coerce.number().int().min(1).max(10).optional().default(5),
});

export const NeighborsQuerySchema = z.object({
  direction: z.enum(['in', 'out', 'both']).optional(),
  relationTypes: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
});

// ========== Request Schemas ==========

export const TraverseSchema = z.object({
  entityId: z.string().min(1, 'entityId is required'),
  options: z
    .object({
      direction: z.enum(['in', 'out', 'both']).optional(),
      maxDepth: z.number().int().min(1).max(10).optional(),
      relationTypes: z.array(z.string()).optional(),
      limit: z.number().int().min(1).max(1000).optional(),
    })
    .optional(),
});

// ========== Inferred Types ==========

export type GetGraphQuery = z.infer<typeof GetGraphQuerySchema>;
export type PathQuery = z.infer<typeof PathQuerySchema>;
export type NeighborsQuery = z.infer<typeof NeighborsQuerySchema>;
export type TraverseInput = z.infer<typeof TraverseSchema>;
