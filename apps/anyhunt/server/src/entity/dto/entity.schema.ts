/**
 * Entity module Zod schemas (Mem0 aligned)
 *
 * [DEFINES]: CreateUserSchema, CreateAgentSchema, CreateAppSchema, CreateRunSchema, ListEntitiesQuerySchema
 * [USED_BY]: entity.controller.ts, entity.service.ts
 */
import { z } from 'zod';
import { JsonValueSchema } from '../../common/utils/json.zod';

const EntityIdSchema = z.string().min(1, 'id is required');
const OptionalEntityIdSchema = z.string().min(1).optional();
const MetadataSchema = z.record(z.string(), JsonValueSchema).optional();

export const CreateUserSchema = z.object({
  user_id: EntityIdSchema,
  metadata: MetadataSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
});

export const CreateAgentSchema = z.object({
  agent_id: EntityIdSchema,
  name: z.string().min(1).optional(),
  metadata: MetadataSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
});

export const CreateAppSchema = z.object({
  app_id: EntityIdSchema,
  name: z.string().min(1).optional(),
  metadata: MetadataSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
});

export const CreateRunSchema = z.object({
  run_id: EntityIdSchema,
  name: z.string().min(1).optional(),
  metadata: MetadataSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
});

export const ListEntitiesQuerySchema = z.object({
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
});

export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['user', 'agent', 'app', 'run']),
  created_at: z.string(),
  updated_at: z.string(),
  total_memories: z.number(),
  owner: z.string(),
  organization: z.string().nullable(),
  metadata: z.record(z.string(), JsonValueSchema).nullable(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type CreateAppInput = z.infer<typeof CreateAppSchema>;
export type CreateRunInput = z.infer<typeof CreateRunSchema>;
export type ListEntitiesQuery = z.infer<typeof ListEntitiesQuerySchema>;
export type EntityResponse = z.infer<typeof EntitySchema>;
