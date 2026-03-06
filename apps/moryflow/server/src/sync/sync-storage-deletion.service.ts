/**
 * [INPUT]: userId + vaultId + SyncStorageDeletionTarget[]
 * [OUTPUT]: 单次安全删除结果（retry/skipped）
 * [POS]: Sync revision 对象删除安全层，仅处理当前协议对象
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { StorageClient, STORAGE_METADATA_STORAGE_REVISION } from '../storage';

export interface SyncStorageDeletionTarget {
  fileId: string;
  expectedHash: string | null;
  expectedStorageRevision: string | null;
}

export interface SyncStorageDeletionResult {
  retryTargets: SyncStorageDeletionTarget[];
  skippedTargets: SyncStorageDeletionTarget[];
}

export type SyncStorageDeletionMode = 'immediate' | 'retry';

@Injectable()
export class SyncStorageDeletionService {
  private readonly logger = new Logger(SyncStorageDeletionService.name);

  constructor(private readonly storageClient: StorageClient) {}

  async deleteTargetsOnce(
    userId: string,
    vaultId: string,
    targets: SyncStorageDeletionTarget[],
    mode: SyncStorageDeletionMode,
  ): Promise<SyncStorageDeletionResult> {
    const retryTargets: SyncStorageDeletionTarget[] = [];
    const skippedTargets: SyncStorageDeletionTarget[] = [];

    for (const target of targets) {
      const outcome = await this.deleteRevisionedTarget(
        userId,
        vaultId,
        target,
        mode,
      );

      if (outcome === 'retry') {
        retryTargets.push(target);
      } else if (outcome === 'skip') {
        skippedTargets.push(target);
      }
    }

    return { retryTargets, skippedTargets };
  }

  private async deleteRevisionedTarget(
    userId: string,
    vaultId: string,
    target: SyncStorageDeletionTarget,
    mode: SyncStorageDeletionMode,
  ): Promise<'deleted' | 'retry' | 'skip'> {
    if (!target.expectedStorageRevision) {
      this.logger.warn(
        `Skip storage deletion for ${target.fileId}: storageRevision is required in ${mode} mode`,
      );
      return 'skip';
    }

    const head = await this.storageClient.headSyncFile(
      userId,
      vaultId,
      target.fileId,
      target.expectedStorageRevision,
    );

    if (!head) {
      return 'deleted';
    }

    const currentRevision =
      head.metadata[STORAGE_METADATA_STORAGE_REVISION] ?? null;
    if (currentRevision !== target.expectedStorageRevision) {
      this.logger.warn(
        `Skip storage deletion for ${target.fileId}: revision mismatch (${currentRevision} !== ${target.expectedStorageRevision})`,
      );
      return 'skip';
    }

    if (!head.eTag) {
      this.logger.warn(
        `Retry storage deletion for ${target.fileId}: missing ETag on revisioned object`,
      );
      return 'retry';
    }

    const deleted = await this.storageClient.deleteSyncFileIfMatch(
      userId,
      vaultId,
      target.fileId,
      target.expectedStorageRevision,
      head.eTag,
    );

    if (deleted === 'deleted') return 'deleted';
    if (deleted === 'precondition_failed') return 'skip';
    return 'retry';
  }
}
