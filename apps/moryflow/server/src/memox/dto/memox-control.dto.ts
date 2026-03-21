import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  MEMOX_WORKSPACE_CONTENT_BATCH_LIMIT,
  MEMOX_WORKSPACE_CONTENT_LEASE_MS,
  MEMOX_WORKSPACE_CONTENT_MAX_BATCHES,
} from '../memox-workspace-content.constants';

export const MemoxWorkspaceContentReplaySchema = z.object({
  batchSize: z
    .number()
    .int()
    .positive()
    .max(500)
    .default(MEMOX_WORKSPACE_CONTENT_BATCH_LIMIT),
  maxBatches: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(MEMOX_WORKSPACE_CONTENT_MAX_BATCHES),
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

export type MemoxWorkspaceContentReplayInput = z.infer<
  typeof MemoxWorkspaceContentReplaySchema
>;
