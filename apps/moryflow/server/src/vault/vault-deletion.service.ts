/**
 * [INPUT]: vaultId
 * [OUTPUT]: 已写入 outbox 并完成 quota 回算的 Vault 删除结果
 * [POS]: Vault 删除统一 teardown 入口，被用户侧与管理侧复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { QuotaService } from '../quota/quota.service';
import { SyncStorageDeletionService } from '../sync/sync-storage-deletion.service';

@Injectable()
export class VaultDeletionService {
  private readonly logger = new Logger(VaultDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    private readonly syncStorageDeletionService: SyncStorageDeletionService,
  ) {}

  async deleteVault(vaultId: string): Promise<void> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        files: {
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
        },
      },
    });

    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    await this.prisma.$transaction(async (tx) => {
      const pendingWorkspaceContentEvents =
        await tx.workspaceContentOutbox.findMany({
          where: {
            workspaceId: vault.workspaceId,
            processedAt: null,
            deadLetteredAt: null,
          },
          select: {
            id: true,
            payload: true,
          },
        });

      const staleSyncObjectRefEventIds = pendingWorkspaceContentEvents
        .filter((event) =>
          this.isPendingSyncObjectRefEvent(event.payload, vault.id),
        )
        .map((event) => event.id);

      if (staleSyncObjectRefEventIds.length > 0) {
        await tx.workspaceContentOutbox.deleteMany({
          where: {
            id: {
              in: staleSyncObjectRefEventIds,
            },
          },
        });
      }

      await tx.vault.delete({ where: { id: vault.id } });
    });

    if (vault.files.length > 0) {
      const { retryTargets, skippedTargets } =
        await this.syncStorageDeletionService.deleteTargetsOnce(
          vault.userId,
          vault.id,
          vault.files.map((file) => ({
            fileId: file.id,
            expectedHash: file.contentHash,
            expectedStorageRevision: file.storageRevision,
          })),
          'immediate',
        );
      if (retryTargets.length > 0 || skippedTargets.length > 0) {
        this.logger.warn(
          `Vault ${vault.id} teardown left ${retryTargets.length} retry target(s) and ${skippedTargets.length} skipped target(s) after DB teardown`,
        );
      }
    }

    await this.quotaService.recalculateStorageUsage(vault.userId);
  }

  private isPendingSyncObjectRefEvent(
    payload: unknown,
    vaultId: string,
  ): boolean {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }

    const mode =
      'mode' in payload && typeof payload.mode === 'string'
        ? payload.mode
        : null;
    const payloadVaultId =
      'vaultId' in payload && typeof payload.vaultId === 'string'
        ? payload.vaultId
        : null;

    return mode === 'sync_object_ref' && payloadVaultId === vaultId;
  }
}
