/**
 * [INPUT]: SyncDiffRequestDto
 * [OUTPUT]: SyncDiffResponseDto
 * [POS]: Sync diff/planning 服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  incrementClock,
  mergeVectorClocks,
  type VectorClock,
} from '@moryflow/sync';
import { PrismaService } from '../prisma';
import { VaultService } from '../vault';
import { QuotaService } from '../quota';
import type { SubscriptionTier } from '../types';
import { computeSyncActions, type RemoteFile } from './sync-diff';
import { computeUploadQuotaStats } from './sync-quota';
import { SyncUploadContractService } from './sync-upload-contract.service';
import {
  SyncActionTokenService,
  type SyncActionTokenUnsignedClaims,
} from './sync-action-token.service';
import type {
  SyncDiffRequestDto,
  SyncDiffResponseDto,
  SyncActionSeedDto,
  LocalFileDto,
} from './dto';

@Injectable()
export class SyncPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultService: VaultService,
    private readonly quotaService: QuotaService,
    private readonly syncUploadContractService: SyncUploadContractService,
    private readonly syncActionTokenService: SyncActionTokenService,
  ) {}

  async calculateDiff(
    userId: string,
    tier: SubscriptionTier,
    dto: SyncDiffRequestDto,
  ): Promise<SyncDiffResponseDto> {
    const { vaultId, deviceId, localFiles } = dto;

    await this.vaultService.getVault(userId, vaultId);

    const device = await this.prisma.vaultDevice.findUnique({
      where: {
        vaultId_deviceId: { vaultId, deviceId },
      },
    });
    const deviceName = device?.deviceName ?? 'Unknown Device';

    const remoteFiles = await this.prisma.syncFile.findMany({
      where: { vaultId },
      select: {
        id: true,
        path: true,
        title: true,
        size: true,
        contentHash: true,
        storageRevision: true,
        vectorClock: true,
        isDeleted: true,
      },
    });

    const remoteFilesTyped: RemoteFile[] = remoteFiles.map((file) => ({
      id: file.id,
      path: file.path,
      title: file.title,
      size: file.size,
      contentHash: file.contentHash,
      storageRevision: file.storageRevision,
      vectorClock: (file.vectorClock as VectorClock) ?? {},
      isDeleted: file.isDeleted,
    }));

    const actions = computeSyncActions(
      localFiles,
      remoteFilesTyped,
      deviceName,
    );

    await this.validateUploadQuota(
      userId,
      tier,
      localFiles,
      remoteFilesTyped,
      actions,
    );

    const localMap = new Map(localFiles.map((file) => [file.fileId, file]));
    const remoteMap = new Map(remoteFilesTyped.map((file) => [file.id, file]));
    const contractedActions =
      this.syncUploadContractService.generatePresignUrls(
        userId,
        vaultId,
        actions,
      );

    return {
      actions: contractedActions.map((action) => {
        const actionId = randomUUID();
        const claims = this.buildActionClaims(
          userId,
          vaultId,
          deviceId,
          actionId,
          action,
          localMap,
          remoteMap,
        );
        return {
          ...action,
          actionId,
          receiptToken: this.syncActionTokenService.issueReceiptToken(claims),
        };
      }),
    };
  }

  private buildActionClaims(
    userId: string,
    vaultId: string,
    deviceId: string,
    actionId: string,
    action: SyncActionSeedDto,
    localMap: Map<string, LocalFileDto>,
    remoteMap: Map<string, RemoteFile>,
  ): SyncActionTokenUnsignedClaims {
    const local = localMap.get(action.fileId);
    const remote = remoteMap.get(action.fileId);

    switch (action.action) {
      case 'upload': {
        if (!local || !action.storageRevision) {
          throw new Error('Invalid upload action contract');
        }
        return {
          userId,
          vaultId,
          deviceId,
          actionId,
          action: 'upload',
          file: {
            fileId: action.fileId,
            path: local.path,
            title: local.title,
            size: local.size,
            contentHash: local.contentHash,
            storageRevision: action.storageRevision,
            vectorClock: local.vectorClock,
            expectedHash: remote?.contentHash,
            expectedStorageRevision: remote?.storageRevision,
            expectedVectorClock: remote?.vectorClock,
          },
        };
      }

      case 'download': {
        if (!remote) {
          throw new Error('Invalid download action contract');
        }
        return {
          userId,
          vaultId,
          deviceId,
          actionId,
          action: 'download',
          file: {
            fileId: remote.id,
            path: remote.path,
            title: remote.title,
            size: remote.size,
            contentHash: remote.contentHash,
            storageRevision: remote.storageRevision,
            vectorClock: remote.vectorClock,
            expectedHash: remote.contentHash,
            expectedStorageRevision: remote.storageRevision,
            expectedVectorClock: remote.vectorClock,
          },
        };
      }

      case 'delete': {
        if (!remote) {
          throw new Error('Invalid delete action contract');
        }
        return {
          userId,
          vaultId,
          deviceId,
          actionId,
          action: 'delete',
          file: {
            fileId: remote.id,
            path: remote.path,
            title: remote.title,
            size: remote.size,
            contentHash: remote.contentHash,
            storageRevision: remote.storageRevision,
            vectorClock: local?.vectorClock ?? remote.vectorClock,
            expectedHash: remote.contentHash,
            expectedStorageRevision: remote.storageRevision,
            expectedVectorClock: remote.vectorClock,
          },
        };
      }

      case 'conflict': {
        if (
          !local ||
          !remote ||
          !action.storageRevision ||
          !action.conflictCopyId ||
          !action.conflictRename ||
          !action.conflictCopyStorageRevision
        ) {
          throw new Error('Invalid conflict action contract');
        }

        return {
          userId,
          vaultId,
          deviceId,
          actionId,
          action: 'conflict',
          original: {
            fileId: action.fileId,
            path: local.path,
            title: local.title,
            size: local.size,
            contentHash: local.contentHash,
            storageRevision: action.storageRevision,
            vectorClock: this.resolveConflictClock(
              local.vectorClock,
              remote.vectorClock,
              deviceId,
            ),
            expectedHash: remote.contentHash,
            expectedStorageRevision: remote.storageRevision,
            expectedVectorClock: remote.vectorClock,
          },
          conflictCopy: {
            fileId: action.conflictCopyId,
            path: action.conflictRename,
            title: action.title ?? remote.title,
            size: remote.size,
            contentHash: remote.contentHash,
            storageRevision: action.conflictCopyStorageRevision,
            vectorClock: remote.vectorClock,
          },
        };
      }
    }
  }

  private resolveConflictClock(
    localClock: VectorClock,
    remoteClock: VectorClock,
    deviceId: string,
  ): VectorClock {
    return incrementClock(mergeVectorClocks(localClock, remoteClock), deviceId);
  }

  private async validateUploadQuota(
    userId: string,
    tier: SubscriptionTier,
    localFiles: LocalFileDto[],
    remoteFiles: RemoteFile[],
    actions: SyncActionSeedDto[],
  ): Promise<void> {
    if (actions.length === 0) return;

    const { uploadSizes, totalNewSize } = computeUploadQuotaStats(
      localFiles,
      remoteFiles,
      actions,
    );

    if (uploadSizes.length > 0) {
      const maxSize = uploadSizes.reduce((max, size) => Math.max(max, size), 0);
      const singleFileCheck = this.quotaService.checkFileSizeAllowed(
        tier,
        maxSize,
      );
      if (!singleFileCheck.allowed) {
        throw new ForbiddenException(singleFileCheck.reason);
      }
    }

    const storageCheck = await this.quotaService.checkStorageAllowed(
      userId,
      tier,
      totalNewSize,
    );
    if (!storageCheck.allowed) {
      throw new ForbiddenException(
        storageCheck.reason ?? 'Storage quota exceeded',
      );
    }
  }
}
