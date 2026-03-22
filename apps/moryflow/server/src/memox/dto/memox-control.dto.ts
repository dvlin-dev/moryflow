import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_BATCH_LIMIT,
  MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_MAX_BATCHES,
  MEMOX_WORKSPACE_CONTENT_LEASE_MS,
} from '../memox-workspace-content.constants';

export const MemoxWorkspaceContentReplaySchema = z.object({
  batchSize: z
    .number()
    .int()
    .positive()
    .max(MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_BATCH_LIMIT)
    .default(MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_BATCH_LIMIT),
  maxBatches: z
    .number()
    .int()
    .positive()
    .max(MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_MAX_BATCHES)
    .default(MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_MAX_BATCHES),
  leaseMs: z
    .number()
    .int()
    .positive()
    .max(600_000)
    .default(MEMOX_WORKSPACE_CONTENT_LEASE_MS),
  consumerId: z.string().trim().min(1).optional(),
  redriveDeadLetterLimit: z.number().int().nonnegative().max(1_000).default(0),
});

export class MemoxWorkspaceContentReplayDto extends createZodDto(
  MemoxWorkspaceContentReplaySchema,
) {}

export const MemoxWorkspaceContentRebuildSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(50_000).optional(),
});

export class MemoxWorkspaceContentRebuildDto extends createZodDto(
  MemoxWorkspaceContentRebuildSchema,
) {}

export type MemoxWorkspaceContentReplayInput = z.infer<
  typeof MemoxWorkspaceContentReplaySchema
>;
export type MemoxWorkspaceContentRebuildInput = z.infer<
  typeof MemoxWorkspaceContentRebuildSchema
>;
