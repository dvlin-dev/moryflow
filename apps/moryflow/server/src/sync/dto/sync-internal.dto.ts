/**
 * [DEFINES]: Sync 内部控制面 DTO
 * [USED_BY]: SyncInternalOutboxController
 * [POS]: Projection consumer 的 claim/ack 协议
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SyncInternalOutboxClaimRequestSchema = z
  .object({
    consumerId: z.string().min(1, 'consumerId is required'),
    limit: z.number().int().min(1).max(100),
    leaseMs: z.number().int().min(1).max(300_000),
  })
  .strict();

export class SyncInternalOutboxClaimRequestDto extends createZodDto(
  SyncInternalOutboxClaimRequestSchema,
) {}

export const SyncInternalOutboxAckRequestSchema = z
  .object({
    consumerId: z.string().min(1, 'consumerId is required'),
    ids: z.array(z.string().uuid('id must be a valid UUID')).max(100),
  })
  .strict();

export class SyncInternalOutboxAckRequestDto extends createZodDto(
  SyncInternalOutboxAckRequestSchema,
) {}

export const SyncInternalOutboxEventSchema = z
  .object({
    id: z.string().uuid('id must be a valid UUID'),
    userId: z.string(),
    vaultId: z.string(),
    fileId: z.string(),
    eventType: z.string(),
    payload: z.record(z.string(), z.unknown()),
    createdAt: z.date(),
    leaseExpiresAt: z.date().nullable(),
  })
  .strict();

export type SyncInternalOutboxEventDto = z.infer<
  typeof SyncInternalOutboxEventSchema
>;

export const SyncInternalOutboxClaimResponseSchema = z
  .object({
    events: z.array(SyncInternalOutboxEventSchema),
  })
  .strict();

export type SyncInternalOutboxClaimResponseDto = z.infer<
  typeof SyncInternalOutboxClaimResponseSchema
>;

export const SyncInternalOutboxAckResponseSchema = z
  .object({
    acknowledged: z.number().int().min(0),
  })
  .strict();

export type SyncInternalOutboxAckResponseDto = z.infer<
  typeof SyncInternalOutboxAckResponseSchema
>;
