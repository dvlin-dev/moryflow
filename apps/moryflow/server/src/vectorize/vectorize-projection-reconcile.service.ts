/**
 * [INPUT]: vectorizedFile projection records + SyncFile 真相源
 * [OUTPUT]: 删除 stale projection 结果
 * [POS]: Vectorize 域的 projection drift reconcile 服务，周期性按文件真相源清理陈旧索引
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma';
import { VectorizeClient } from './vectorize.client';

interface VectorizedProjectionRecord {
  userId: string;
  fileId: string;
}

export interface VectorizeProjectionReconcileResult {
  scanned: number;
  stale: number;
  deleted: number;
  failed: number;
}

interface ProjectionCleanupWriter {
  vectorizedFile: {
    deleteMany: (args: {
      where: {
        userId: string;
        fileId: { in: string[] };
      };
    }) => Promise<{ count: number }>;
  };
  userStorageUsage: {
    updateMany: (args: {
      where: { userId: string };
      data: { vectorizedCount: { decrement: number } };
    }) => Promise<unknown>;
  };
}

@Injectable()
export class VectorizeProjectionReconcileService {
  private readonly logger = new Logger(
    VectorizeProjectionReconcileService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorizeClient: VectorizeClient,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async reconcileProjectionDrift(): Promise<void> {
    const result = await this.reconcileOnce();
    if (result.stale === 0) {
      return;
    }

    this.logger.log(
      `Projection reconcile finished: scanned=${result.scanned}, stale=${result.stale}, deleted=${result.deleted}, failed=${result.failed}`,
    );
  }

  async reconcileOnce(
    limit = 200,
  ): Promise<VectorizeProjectionReconcileResult> {
    const records = (await this.prisma.vectorizedFile.findMany({
      orderBy: { updatedAt: 'asc' },
      take: limit,
      select: {
        userId: true,
        fileId: true,
      },
    })) as VectorizedProjectionRecord[];

    if (records.length === 0) {
      return {
        scanned: 0,
        stale: 0,
        deleted: 0,
        failed: 0,
      };
    }

    const liveSyncFiles = await this.prisma.syncFile.findMany({
      where: {
        id: { in: records.map((record) => record.fileId) },
        isDeleted: false,
      },
      select: { id: true },
    });
    const liveIds = new Set(liveSyncFiles.map((file) => file.id));
    const staleRecords = records.filter(
      (record) => !liveIds.has(record.fileId),
    );

    if (staleRecords.length === 0) {
      return {
        scanned: records.length,
        stale: 0,
        deleted: 0,
        failed: 0,
      };
    }

    let deletedCount = 0;
    let failedCount = 0;

    for (const [userId, fileIds] of this.groupByUser(staleRecords)) {
      try {
        await this.vectorizeClient.delete(userId, fileIds);
      } catch (error) {
        this.logger.warn(
          `Vector worker delete failed during projection reconcile for user ${userId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      try {
        const deletedForUser = await this.prisma.$transaction(
          async (tx: ProjectionCleanupWriter) => {
            const deleted = await tx.vectorizedFile.deleteMany({
              where: {
                userId,
                fileId: { in: fileIds },
              },
            });

            if (deleted.count > 0) {
              await tx.userStorageUsage.updateMany({
                where: { userId },
                data: {
                  vectorizedCount: { decrement: deleted.count },
                },
              });
            }

            return deleted.count;
          },
        );

        deletedCount += deletedForUser;
      } catch (error) {
        failedCount += fileIds.length;
        this.logger.error(
          `Projection reconcile failed for user ${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return {
      scanned: records.length,
      stale: staleRecords.length,
      deleted: deletedCount,
      failed: failedCount,
    };
  }

  private groupByUser(
    records: VectorizedProjectionRecord[],
  ): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const record of records) {
      const current = groups.get(record.userId) ?? [];
      current.push(record.fileId);
      groups.set(record.userId, current);
    }
    return groups;
  }
}
