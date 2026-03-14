/**
 * [INPUT]: (SyncDiffRequest, SyncCommitRequest) - 本地文件清单与同步提交请求
 * [OUTPUT]: (SyncActions[], 预签名URL) - 同步指令与 R2 上传/下载链接
 * [POS]: 云同步协调服务，仅保留对外编排与文件列表查询
 * [DOC]: docs/design/moryflow/features/cloud-sync-unified-implementation.md
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import type { SubscriptionTier, PaginationParams } from '../types';
import { PrismaService } from '../prisma';
import { VaultService } from '../vault';
import { SyncPlanService } from './sync-plan.service';
import { SyncCommitService } from './sync-commit.service';
import { SyncOrphanCleanupService } from './sync-orphan-cleanup.service';
import { SyncTelemetryService } from './sync-telemetry.service';
import type {
  SyncDiffRequestDto,
  SyncDiffResponseDto,
  SyncCommitRequestDto,
  SyncCommitResponseDto,
  FileListResponseDto,
  SyncCleanupOrphansRequestDto,
  SyncCleanupOrphansResponseDto,
} from './dto';
import { type VectorClock } from '@moryflow/sync';

/** 默认分页限制 */
const DEFAULT_LIMIT = 100;
/** 最大分页限制 */
const MAX_LIMIT = 1000;

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => VaultService))
    private readonly vaultService: VaultService,
    private readonly syncPlanService: SyncPlanService,
    private readonly syncCommitService: SyncCommitService,
    private readonly syncOrphanCleanupService: SyncOrphanCleanupService,
    private readonly syncTelemetryService: SyncTelemetryService,
  ) {}

  async calculateDiff(
    userId: string,
    tier: SubscriptionTier,
    dto: SyncDiffRequestDto,
  ): Promise<SyncDiffResponseDto> {
    const startedAt = Date.now();
    try {
      const result = await this.syncPlanService.calculateDiff(
        userId,
        tier,
        dto,
      );
      this.syncTelemetryService.recordDiff(result, Date.now() - startedAt);
      return result;
    } catch (error) {
      this.syncTelemetryService.recordDiffFailure(Date.now() - startedAt);
      throw error;
    }
  }

  async commitSync(
    userId: string,
    dto: SyncCommitRequestDto,
  ): Promise<SyncCommitResponseDto> {
    const startedAt = Date.now();
    try {
      const result = await this.syncCommitService.commitSync(userId, dto);
      this.syncTelemetryService.recordCommit(
        dto.receipts.length,
        result,
        Date.now() - startedAt,
      );
      return result;
    } catch (error) {
      this.syncTelemetryService.recordCommitFailure(
        dto.receipts.length,
        Date.now() - startedAt,
      );
      throw error;
    }
  }

  async cleanupOrphans(
    userId: string,
    dto: SyncCleanupOrphansRequestDto,
  ): Promise<SyncCleanupOrphansResponseDto> {
    const startedAt = Date.now();
    try {
      const result = await this.syncOrphanCleanupService.cleanupOrphans(
        userId,
        dto,
      );
      this.syncTelemetryService.recordOrphanCleanup(
        dto.objects.length,
        result,
        Date.now() - startedAt,
      );
      return result;
    } catch (error) {
      this.syncTelemetryService.recordOrphanCleanupFailure(
        dto.objects.length,
        Date.now() - startedAt,
      );
      throw error;
    }
  }

  async listFiles(
    userId: string,
    vaultId: string,
    pagination?: PaginationParams,
  ): Promise<FileListResponseDto> {
    await this.vaultService.getVault(userId, vaultId);

    const limit = Math.min(pagination?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = pagination?.offset ?? 0;

    const [files, total] = await Promise.all([
      this.prisma.syncFile.findMany({
        where: { vaultId, isDeleted: false },
        orderBy: { path: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.syncFile.count({
        where: { vaultId, isDeleted: false },
      }),
    ]);

    return {
      files: files.map((file) => ({
        fileId: file.id,
        path: file.path,
        title: file.title,
        size: file.size,
        contentHash: file.contentHash,
        vectorClock: (file.vectorClock as VectorClock) ?? {},
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + files.length < total,
      },
    };
  }
}
