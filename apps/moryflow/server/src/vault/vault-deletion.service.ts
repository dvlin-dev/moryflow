/**
 * [INPUT]: vaultId
 * [OUTPUT]: 已写入 outbox 并完成 quota 回算的 Vault 删除结果
 * [POS]: Vault 删除统一 teardown 入口，被用户侧与管理侧复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { VectorClock } from '@moryflow/sync';
import { PrismaService } from '../prisma';
import { QuotaService } from '../quota/quota.service';
import { FileLifecycleOutboxWriterService } from '../sync/file-lifecycle-outbox-writer.service';
import type { ExistingSyncFileState } from '../sync/file-lifecycle-outbox.types';
import { SyncStorageDeletionService } from '../sync/sync-storage-deletion.service';

@Injectable()
export class VaultDeletionService {
  private readonly logger = new Logger(VaultDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    private readonly outboxWriter: FileLifecycleOutboxWriterService,
    private readonly syncStorageDeletionService: SyncStorageDeletionService,
  ) {}

  async deleteVault(vaultId: string): Promise<void> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      select: {
        id: true,
        userId: true,
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

    const fileIds = vault.files.map((file) => file.id);
    const existingMap = new Map<string, ExistingSyncFileState>(
      vault.files.map((file) => [
        file.id,
        {
          path: file.path,
          title: file.title,
          size: file.size,
          contentHash: file.contentHash,
          storageRevision: file.storageRevision,
          vectorClock: file.vectorClock as VectorClock,
          isDeleted: file.isDeleted,
        },
      ]),
    );

    await this.prisma.$transaction(async (tx) => {
      await this.outboxWriter.appendSyncCommitEvents(
        tx,
        vault.userId,
        vault.id,
        [],
        fileIds.map((fileId) => ({ fileId })),
        existingMap,
      );

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
}
