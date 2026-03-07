/**
 * [DEFINES]: file lifecycle outbox 的写侧/租约侧共享类型
 * [USED_BY]: sync-commit、sync internal outbox、memox outbox consumer
 * [POS]: Sync -> Memox file lifecycle 协议事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { VectorClock } from '@moryflow/sync';
import type { Prisma } from '../../generated/prisma/client';

export interface ExistingSyncFileState {
  path: string;
  title: string;
  size: number;
  contentHash: string;
  storageRevision: string;
  vectorClock: VectorClock;
  isDeleted: boolean;
}

export interface PublishedSyncFile {
  fileId: string;
  path: string;
  title: string;
  size: number;
  contentHash: string;
  storageRevision: string;
  vectorClock: VectorClock;
}

export interface DeletedSyncFile {
  fileId: string;
}

export interface FileUpsertedLifecyclePayload {
  path: string;
  title: string;
  size: number;
  contentHash: string;
  storageRevision: string;
  vectorClock: VectorClock;
  previousPath: string | null;
  previousContentHash: string | null;
  previousStorageRevision: string | null;
}

export interface FileDeletedLifecyclePayload {
  path: string | null;
  contentHash: string | null;
  storageRevision: string | null;
}

export interface FileLifecycleOutboxWriterStore {
  fileLifecycleOutbox: {
    createMany: (args: {
      data: Prisma.FileLifecycleOutboxCreateManyInput[];
    }) => Promise<unknown>;
  };
}

export interface FileLifecycleOutboxRecord {
  id: string;
  userId: string;
  vaultId: string;
  fileId: string;
  eventType: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
  attemptCount: number;
  lastAttemptAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  deadLetteredAt: Date | null;
  processedAt: Date | null;
  leasedBy: string | null;
  leaseExpiresAt: Date | null;
}

export interface ClaimPendingBatchOptions {
  consumerId: string;
  limit: number;
  leaseMs: number;
  now?: Date;
}

export interface FailClaimedEventOptions {
  consumerId: string;
  id: string;
  attemptCount: number;
  errorCode?: string | null;
  errorMessage: string;
  retryable: boolean;
  now?: Date;
}

export interface FailClaimedEventResult {
  state: 'retry_scheduled' | 'dead_lettered';
  retryAt: Date | null;
}
