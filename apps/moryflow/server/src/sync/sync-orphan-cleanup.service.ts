/**
 * [INPUT]: SyncCleanupOrphansRequestDto
 * [OUTPUT]: SyncCleanupOrphansResponseDto
 * [POS]: 同步恢复期 orphan object 清理服务，仅处理未发布 revision 的对象回收
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { VaultService } from '../vault';
import { SyncCleanupService } from './sync-cleanup.service';
import {
  SyncStorageDeletionService,
  type SyncStorageDeletionTarget,
} from './sync-storage-deletion.service';
import { SyncObjectVerifyService } from './sync-object-verify.service';
import type {
  SyncCleanupOrphansRequestDto,
  SyncCleanupOrphansResponseDto,
} from './dto';

@Injectable()
export class SyncOrphanCleanupService {
  private readonly logger = new Logger(SyncOrphanCleanupService.name);

  constructor(
    private readonly vaultService: VaultService,
    private readonly syncCleanupService: SyncCleanupService,
    private readonly syncStorageDeletionService: SyncStorageDeletionService,
    private readonly syncObjectVerifyService: SyncObjectVerifyService,
  ) {}

  async cleanupOrphans(
    userId: string,
    dto: SyncCleanupOrphansRequestDto,
  ): Promise<SyncCleanupOrphansResponseDto> {
    const { vaultId, objects } = dto;

    await this.vaultService.getVault(userId, vaultId);

    if (objects.length === 0) {
      return {
        accepted: true,
        deletedCount: 0,
        retryCount: 0,
        skippedCount: 0,
      };
    }

    const dedupedObjects = [
      ...new Map(
        objects.map((object) => [
          `${object.fileId}:${object.storageRevision}`,
          object,
        ]),
      ).values(),
    ];

    const existingMap =
      await this.syncObjectVerifyService.loadOwnedExistingFiles(vaultId, [
        ...new Set(dedupedObjects.map((object) => object.fileId)),
      ]);

    let protectedCount = 0;
    const targets: SyncStorageDeletionTarget[] = [];

    for (const object of dedupedObjects) {
      const current = existingMap.get(object.fileId);
      if (
        current &&
        !current.isDeleted &&
        current.storageRevision === object.storageRevision
      ) {
        protectedCount += 1;
        continue;
      }

      targets.push({
        fileId: object.fileId,
        expectedHash: object.contentHash,
        expectedStorageRevision: object.storageRevision,
      });
    }

    if (targets.length === 0) {
      return {
        accepted: true,
        deletedCount: 0,
        retryCount: 0,
        skippedCount: protectedCount,
      };
    }

    const { retryTargets, skippedTargets } =
      await this.syncStorageDeletionService.deleteTargetsOnce(
        userId,
        vaultId,
        targets,
        'immediate',
      );

    if (retryTargets.length > 0) {
      this.logger.warn(
        `Recovery cleanup deferred for vault ${vaultId}, enqueueing ${retryTargets.length} orphan target(s)`,
      );
      await this.syncCleanupService.enqueueStorageDeletionRetry(
        userId,
        vaultId,
        retryTargets,
      );
    }

    return {
      accepted: true,
      deletedCount:
        targets.length - retryTargets.length - skippedTargets.length,
      retryCount: retryTargets.length,
      skippedCount: skippedTargets.length + protectedCount,
    };
  }
}
