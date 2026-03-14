/**
 * [INPUT]: SyncCommitRequestDto
 * [OUTPUT]: SyncCommitResponseDto
 * [POS]: Sync commit/publish 服务，仅接受 action receipt
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import type { VectorClock } from '@moryflow/sync';
import { PrismaService } from '../prisma';
import { VaultService } from '../vault';
import { SyncCleanupService } from './sync-cleanup.service';
import {
  SyncStorageDeletionService,
  type SyncStorageDeletionTarget,
} from './sync-storage-deletion.service';
import {
  SyncActionTokenService,
  type SyncActionTokenClaims,
} from './sync-action-token.service';
import {
  SyncObjectVerifyService,
  type ExistingSyncFileState,
} from './sync-object-verify.service';
import type {
  SyncCommitRequestDto,
  SyncCommitResponseDto,
  ConflictFileDto,
} from './dto';

interface PublishDeleteOperation {
  fileId: string;
  vectorClock: VectorClock;
}

interface PublishedSyncFile {
  fileId: string;
  path: string;
  title: string;
  size: number;
  contentHash: string;
  storageRevision: string;
  vectorClock: VectorClock;
}

interface CommitPlan {
  upserts: PublishedSyncFile[];
  deleted: PublishDeleteOperation[];
  cleanupTargets: SyncStorageDeletionTarget[];
}

@Injectable()
export class SyncCommitService {
  private readonly logger = new Logger(SyncCommitService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => VaultService))
    private readonly vaultService: VaultService,
    private readonly syncCleanupService: SyncCleanupService,
    private readonly syncObjectVerifyService: SyncObjectVerifyService,
    private readonly syncStorageDeletionService: SyncStorageDeletionService,
    private readonly syncActionTokenService: SyncActionTokenService,
  ) {}

  async commitSync(
    userId: string,
    dto: SyncCommitRequestDto,
  ): Promise<SyncCommitResponseDto> {
    const { vaultId, deviceId, receipts } = dto;

    this.assertUniqueActionIds(receipts);
    await this.vaultService.getVault(userId, vaultId);

    const claims = receipts.map((receipt) =>
      this.syncActionTokenService.verifyReceiptToken(receipt.receiptToken, {
        userId,
        vaultId,
        deviceId,
        actionId: receipt.actionId,
      }),
    );

    this.assertUniqueTargetFileIds(claims);

    const affectedFileIds = this.collectAffectedFileIds(claims);
    const existingFileMap =
      await this.syncObjectVerifyService.loadOwnedExistingFiles(
        vaultId,
        affectedFileIds,
      );

    const conflicts = this.collectConflicts(claims, existingFileMap);
    if (conflicts.length > 0) {
      return {
        success: false,
        syncedAt: new Date(),
        conflicts,
      };
    }

    await this.verifyUploadedObjects(userId, vaultId, claims);

    const plan = this.buildCommitPlan(claims, existingFileMap);
    const sizeDelta = this.calculateSizeDelta(plan, existingFileMap);

    await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.vault.findUnique({
        where: { id: vaultId },
        select: {
          workspaceId: true,
        },
      });

      if (!workspace) {
        throw new NotFoundException('Vault not found');
      }

      for (const file of plan.upserts) {
        await this.ensureWorkspaceDocumentForSyncFile(
          tx,
          workspace.workspaceId,
          file,
        );

        await tx.syncFile.deleteMany({
          where: {
            vaultId,
            path: file.path,
            id: { not: file.fileId },
          },
        });

        await tx.syncFile.upsert({
          where: { id: file.fileId },
          create: {
            id: file.fileId,
            documentId: file.fileId,
            vaultId,
            path: file.path,
            title: file.title,
            size: file.size,
            contentHash: file.contentHash,
            storageRevision: file.storageRevision,
            vectorClock: file.vectorClock,
            isDeleted: false,
          },
          update: {
            documentId: file.fileId,
            path: file.path,
            title: file.title,
            size: file.size,
            contentHash: file.contentHash,
            storageRevision: file.storageRevision,
            vectorClock: file.vectorClock,
            isDeleted: false,
          },
        });
      }

      for (const item of plan.deleted) {
        await tx.syncFile.updateMany({
          where: {
            id: item.fileId,
            vaultId,
          },
          data: {
            isDeleted: true,
            vectorClock: item.vectorClock,
          },
        });
      }

      await tx.vaultDevice.upsert({
        where: {
          vaultId_deviceId: { vaultId, deviceId },
        },
        create: {
          vaultId,
          deviceId,
          deviceName: 'Unknown Device',
          lastSyncAt: new Date(),
        },
        update: {
          lastSyncAt: new Date(),
        },
      });

      await this.updateStorageUsageIncremental(tx, userId, sizeDelta);
    });

    await this.deleteFilesFromStorage(userId, vaultId, plan.cleanupTargets);

    return {
      success: true,
      syncedAt: new Date(),
    };
  }

  private collectAffectedFileIds(claims: SyncActionTokenClaims[]): string[] {
    return [
      ...new Set(
        claims.flatMap((claim) => {
          if (claim.action === 'conflict') {
            return [claim.original.fileId, claim.conflictCopy.fileId];
          }
          return [claim.file.fileId];
        }),
      ),
    ];
  }

  private assertUniqueActionIds(
    receipts: SyncCommitRequestDto['receipts'],
  ): void {
    const seen = new Set<string>();

    for (const receipt of receipts) {
      if (seen.has(receipt.actionId)) {
        throw new BadRequestException({
          message: 'Duplicate actionId in commit request',
          code: 'DUPLICATE_ACTION_ID',
        });
      }

      seen.add(receipt.actionId);
    }
  }

  private assertUniqueTargetFileIds(claims: SyncActionTokenClaims[]): void {
    const seen = new Set<string>();

    for (const claim of claims) {
      const targetFileIds =
        claim.action === 'conflict'
          ? [claim.original.fileId, claim.conflictCopy.fileId]
          : [claim.file.fileId];

      for (const fileId of targetFileIds) {
        if (seen.has(fileId)) {
          throw new BadRequestException({
            message: 'Duplicate fileId in commit request',
            code: 'DUPLICATE_FILE_RECEIPT',
          });
        }

        seen.add(fileId);
      }
    }
  }

  private collectConflicts(
    claims: SyncActionTokenClaims[],
    existingMap: Map<string, ExistingSyncFileState>,
  ): ConflictFileDto[] {
    const conflicts: ConflictFileDto[] = [];

    for (const claim of claims) {
      if (claim.action === 'conflict') {
        const current = existingMap.get(claim.original.fileId);
        if (
          this.isExpectedStateMismatch(
            current,
            claim.original.expectedHash,
            claim.original.expectedStorageRevision,
            claim.original.expectedVectorClock,
          )
        ) {
          conflicts.push(
            this.createConflictEntry(
              claim.original.fileId,
              claim.original.path,
              current,
              claim.original.expectedHash,
            ),
          );
        }
        continue;
      }

      if (claim.action === 'download') {
        const current = existingMap.get(claim.file.fileId);
        if (
          this.isExpectedStateMismatch(
            current,
            claim.file.expectedHash,
            claim.file.expectedStorageRevision,
            claim.file.expectedVectorClock,
          )
        ) {
          conflicts.push(
            this.createConflictEntry(
              claim.file.fileId,
              claim.file.path,
              current,
              claim.file.expectedHash,
            ),
          );
        }
        continue;
      }

      if (claim.action === 'upload') {
        const current = existingMap.get(claim.file.fileId);
        if (
          this.isCreateOverwriteConflict(
            current,
            claim.file.expectedHash,
            claim.file.expectedStorageRevision,
            claim.file.expectedVectorClock,
          )
        ) {
          conflicts.push(
            this.createConflictEntry(
              claim.file.fileId,
              claim.file.path,
              current,
              claim.file.expectedHash,
            ),
          );
        }
        continue;
      }

      if (claim.action === 'delete') {
        const current = existingMap.get(claim.file.fileId);
        if (
          current &&
          !current.isDeleted &&
          this.isExpectedStateMismatch(
            current,
            claim.file.expectedHash,
            claim.file.expectedStorageRevision,
            claim.file.expectedVectorClock,
          )
        ) {
          conflicts.push(
            this.createConflictEntry(
              claim.file.fileId,
              claim.file.path,
              current,
              claim.file.expectedHash,
            ),
          );
        }
      }
    }

    return conflicts;
  }

  private async verifyUploadedObjects(
    userId: string,
    vaultId: string,
    claims: SyncActionTokenClaims[],
  ): Promise<void> {
    for (const claim of claims) {
      if (claim.action === 'upload') {
        await this.syncObjectVerifyService.verifyUploadedObject(
          userId,
          vaultId,
          claim.file.fileId,
          claim.file.storageRevision,
          claim.file.contentHash,
        );
        continue;
      }

      if (claim.action === 'conflict') {
        await this.syncObjectVerifyService.verifyUploadedObject(
          userId,
          vaultId,
          claim.original.fileId,
          claim.original.storageRevision,
          claim.original.contentHash,
        );
        await this.syncObjectVerifyService.verifyUploadedObject(
          userId,
          vaultId,
          claim.conflictCopy.fileId,
          claim.conflictCopy.storageRevision,
          claim.conflictCopy.contentHash,
        );
      }
    }
  }

  private buildCommitPlan(
    claims: SyncActionTokenClaims[],
    existingMap: Map<string, ExistingSyncFileState>,
  ): CommitPlan {
    const upserts: PublishedSyncFile[] = [];
    const deleted: PublishDeleteOperation[] = [];
    const cleanupTargets: SyncStorageDeletionTarget[] = [];

    for (const claim of claims) {
      switch (claim.action) {
        case 'upload': {
          upserts.push({
            fileId: claim.file.fileId,
            path: claim.file.path,
            title: claim.file.title,
            size: claim.file.size,
            contentHash: claim.file.contentHash,
            storageRevision: claim.file.storageRevision,
            vectorClock: claim.file.vectorClock,
          });
          this.pushSupersededCleanupTarget(
            cleanupTargets,
            claim.file.fileId,
            existingMap.get(claim.file.fileId),
          );
          break;
        }

        case 'download':
          break;

        case 'delete': {
          deleted.push({
            fileId: claim.file.fileId,
            vectorClock: claim.file.vectorClock,
          });
          this.pushSupersededCleanupTarget(
            cleanupTargets,
            claim.file.fileId,
            existingMap.get(claim.file.fileId),
          );
          break;
        }

        case 'conflict': {
          upserts.push({
            fileId: claim.original.fileId,
            path: claim.original.path,
            title: claim.original.title,
            size: claim.original.size,
            contentHash: claim.original.contentHash,
            storageRevision: claim.original.storageRevision,
            vectorClock: claim.original.vectorClock,
          });
          upserts.push({
            fileId: claim.conflictCopy.fileId,
            path: claim.conflictCopy.path,
            title: claim.conflictCopy.title,
            size: claim.conflictCopy.size,
            contentHash: claim.conflictCopy.contentHash,
            storageRevision: claim.conflictCopy.storageRevision,
            vectorClock: claim.conflictCopy.vectorClock,
          });
          this.pushSupersededCleanupTarget(
            cleanupTargets,
            claim.original.fileId,
            existingMap.get(claim.original.fileId),
          );
          break;
        }
      }
    }

    return { upserts, deleted, cleanupTargets };
  }

  private pushSupersededCleanupTarget(
    cleanupTargets: SyncStorageDeletionTarget[],
    fileId: string,
    existing: ExistingSyncFileState | undefined,
  ): void {
    if (!existing || existing.isDeleted) {
      return;
    }

    cleanupTargets.push({
      fileId,
      expectedHash: existing.contentHash,
      expectedStorageRevision: existing.storageRevision,
    });
  }

  private calculateSizeDelta(
    plan: CommitPlan,
    existingMap: Map<string, ExistingSyncFileState>,
  ): bigint {
    let delta = BigInt(0);

    for (const file of plan.upserts) {
      const old = existingMap.get(file.fileId);
      const oldSize = old && !old.isDeleted ? old.size : 0;
      delta += BigInt(file.size - oldSize);
    }

    for (const item of plan.deleted) {
      const old = existingMap.get(item.fileId);
      const oldSize = old && !old.isDeleted ? old.size : 0;
      delta -= BigInt(oldSize);
    }

    return delta;
  }

  private async deleteFilesFromStorage(
    userId: string,
    vaultId: string,
    targets: SyncStorageDeletionTarget[],
  ): Promise<void> {
    if (targets.length === 0) {
      return;
    }

    const { retryTargets, skippedTargets } =
      await this.syncStorageDeletionService.deleteTargetsOnce(
        userId,
        vaultId,
        targets,
        'immediate',
      );

    if (skippedTargets.length > 0) {
      this.logger.warn(
        `Skipped ${skippedTargets.length} storage deletion(s) for vault ${vaultId} due to revision mismatch`,
      );
    }

    if (retryTargets.length === 0) {
      return;
    }

    this.logger.warn(
      `Storage deletion deferred for vault ${vaultId}, enqueueing ${retryTargets.length} cleanup retry target(s)`,
    );
    await this.syncCleanupService.enqueueStorageDeletionRetry(
      userId,
      vaultId,
      retryTargets,
    );
  }

  private isExpectedStateMismatch(
    current: ExistingSyncFileState | undefined,
    expectedHash?: string,
    expectedStorageRevision?: string,
    expectedVectorClock?: VectorClock,
  ): boolean {
    if (!current || current.isDeleted) {
      return true;
    }

    if (expectedHash && current.contentHash !== expectedHash) {
      return true;
    }

    if (
      expectedStorageRevision &&
      current.storageRevision !== expectedStorageRevision
    ) {
      return true;
    }

    if (
      expectedVectorClock &&
      !this.isClockEqual(current.vectorClock, expectedVectorClock)
    ) {
      return true;
    }

    return false;
  }

  private isCreateOverwriteConflict(
    current: ExistingSyncFileState | undefined,
    expectedHash?: string,
    expectedStorageRevision?: string,
    expectedVectorClock?: VectorClock,
  ): boolean {
    if (!current || current.isDeleted) {
      return Boolean(
        expectedHash || expectedStorageRevision || expectedVectorClock,
      );
    }

    if (!expectedHash && !expectedStorageRevision && !expectedVectorClock) {
      return true;
    }

    return this.isExpectedStateMismatch(
      current,
      expectedHash,
      expectedStorageRevision,
      expectedVectorClock,
    );
  }

  private createConflictEntry(
    fileId: string,
    path: string,
    current: ExistingSyncFileState | undefined,
    expectedHash?: string,
  ): ConflictFileDto {
    return {
      fileId,
      path: current?.path ?? path,
      expectedHash: expectedHash ?? '',
      currentHash: current?.contentHash ?? '',
    };
  }

  private isClockEqual(left: VectorClock, right: VectorClock): boolean {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    return leftKeys.every((key, index) => {
      const rightKey = rightKeys[index];
      if (key !== rightKey) return false;
      return left[key] === right[rightKey];
    });
  }

  private async updateStorageUsageIncremental(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    userId: string,
    delta: bigint,
  ): Promise<void> {
    if (delta === BigInt(0)) return;

    await tx.$executeRaw`
      INSERT INTO "UserStorageUsage" ("id", "userId", "storageUsed", "updatedAt")
      VALUES (gen_random_uuid(), ${userId}, GREATEST(${delta}, 0), CURRENT_TIMESTAMP)
      ON CONFLICT ("userId")
      DO UPDATE SET
        "storageUsed" = GREATEST("UserStorageUsage"."storageUsed" + ${delta}, 0),
        "updatedAt" = CURRENT_TIMESTAMP
    `;
  }

  private async ensureWorkspaceDocumentForSyncFile(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    workspaceId: string,
    file: PublishedSyncFile,
  ): Promise<void> {
    const existing = await tx.workspaceDocument.findUnique({
      where: { id: file.fileId },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (existing && existing.workspaceId !== workspaceId) {
      throw new ConflictException(
        'Document does not belong to current workspace',
      );
    }

    // Clear any other document that currently occupies the target path within
    // this workspace to prevent unique-constraint violations during path-swap
    // renames (e.g., a.md ↔ b.md in the same commit batch). The displaced
    // document's path is set to its own id (globally unique) as a safe
    // fallback; the correct path will be written when that document is
    // processed later in the same batch, or in the next sync cycle.
    await tx.$executeRaw`
      UPDATE "WorkspaceDocument"
      SET "path" = "id"
      WHERE "workspaceId" = ${workspaceId}
        AND "path" = ${file.path}
        AND "id" != ${file.fileId}
    `;

    await tx.workspaceDocument.upsert({
      where: { id: file.fileId },
      create: {
        id: file.fileId,
        workspaceId,
        path: file.path,
        title: file.title,
        mimeType: 'text/markdown',
      },
      update: {
        path: file.path,
        title: file.title,
        mimeType: 'text/markdown',
      },
    });
  }
}
