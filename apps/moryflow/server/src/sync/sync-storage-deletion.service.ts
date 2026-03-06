/**
 * [INPUT]: userId + vaultId + SyncStorageDeletionTarget[]
 * [OUTPUT]: 单次安全删除结果（retry/skipped）
 * [POS]: Sync 对象删除安全层，统一处理对象代际校验与 legacy 清理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma';
import {
  StorageClient,
  STORAGE_METADATA_CONTENT_HASH,
  STORAGE_METADATA_STORAGE_REVISION,
} from '../storage';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageClient: StorageClient,
  ) {}

  async deleteTargetsOnce(
    userId: string,
    vaultId: string,
    targets: SyncStorageDeletionTarget[],
    mode: SyncStorageDeletionMode,
  ): Promise<SyncStorageDeletionResult> {
    const retryTargets: SyncStorageDeletionTarget[] = [];
    const skippedTargets: SyncStorageDeletionTarget[] = [];

    for (const target of targets) {
      const outcome = target.expectedStorageRevision
        ? await this.deleteRevisionedTarget(userId, vaultId, target)
        : await this.deleteLegacyTarget(userId, vaultId, target, mode);

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
  ): Promise<'deleted' | 'retry' | 'skip'> {
    const head = await this.storageClient.headFile(
      userId,
      vaultId,
      target.fileId,
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

    const deleted = await this.storageClient.deleteFileIfMatch(
      userId,
      vaultId,
      target.fileId,
      head.eTag,
    );

    if (deleted === 'deleted') return 'deleted';
    if (deleted === 'precondition_failed') return 'skip';
    return 'retry';
  }

  private async deleteLegacyTarget(
    userId: string,
    vaultId: string,
    target: SyncStorageDeletionTarget,
    mode: SyncStorageDeletionMode,
  ): Promise<'deleted' | 'retry' | 'skip'> {
    if (mode === 'immediate') {
      return 'retry';
    }

    if (!target.expectedHash) {
      this.logger.warn(
        `Skip legacy cleanup for ${target.fileId}: expectedHash is missing`,
      );
      return 'skip';
    }

    const file = await this.prisma.syncFile.findUnique({
      where: { id: target.fileId },
      select: {
        isDeleted: true,
        contentHash: true,
      },
    });

    if (!file || !file.isDeleted || file.contentHash !== target.expectedHash) {
      this.logger.warn(
        `Skip legacy cleanup for ${target.fileId}: DB tombstone no longer matches`,
      );
      return 'skip';
    }

    const head = await this.storageClient.headFile(
      userId,
      vaultId,
      target.fileId,
    );
    if (!head) {
      return 'deleted';
    }

    const remoteHash =
      head.metadata[STORAGE_METADATA_CONTENT_HASH] ??
      (await this.computeRemoteHash(userId, vaultId, target.fileId));

    if (remoteHash !== target.expectedHash) {
      this.logger.warn(
        `Skip legacy cleanup for ${target.fileId}: content hash mismatch (${remoteHash} !== ${target.expectedHash})`,
      );
      return 'skip';
    }

    if (!head.eTag) {
      this.logger.warn(
        `Retry legacy cleanup for ${target.fileId}: missing ETag after hash verification`,
      );
      return 'retry';
    }

    const deleted = await this.storageClient.deleteFileIfMatch(
      userId,
      vaultId,
      target.fileId,
      head.eTag,
    );

    if (deleted === 'deleted') return 'deleted';
    if (deleted === 'precondition_failed') return 'skip';
    return 'retry';
  }

  private async computeRemoteHash(
    userId: string,
    vaultId: string,
    fileId: string,
  ): Promise<string> {
    const { stream } = await this.storageClient.downloadStream(
      userId,
      vaultId,
      fileId,
    );
    const hash = createHash('sha256');

    for await (const chunk of stream) {
      if (typeof chunk === 'string') {
        hash.update(chunk);
        continue;
      }
      hash.update(Buffer.from(chunk));
    }

    return hash.digest('hex');
  }
}
