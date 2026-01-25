/**
 * [INPUT]: (SyncDiffRequest, SyncCommitRequest) - 本地文件清单与同步提交请求
 * [OUTPUT]: (SyncActions[], 预签名URL) - 同步指令与 R2 上传/下载链接
 * [POS]: 云同步核心服务，基于向量时钟实现双向差异计算、冲突解决与额度校验
 * [DOC]: docs/products/moryflow/research/sync-refactor-proposal.md
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Injectable,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { type VectorClock } from '@anyhunt/sync';
import { PrismaService } from '../prisma';
import { VaultService } from '../vault';
import { QuotaService } from '../quota';
import { StorageClient } from '../storage';
import { VectorizeService } from '../vectorize';
import { getMimeType, getFileName } from '../storage/mime-utils';
import type { SubscriptionTier, PaginationParams } from '../types';
import { computeSyncActions, type RemoteFile } from './sync-diff';
import { computeUploadQuotaStats } from './sync-quota';
import type {
  SyncDiffRequestDto,
  SyncDiffResponseDto,
  SyncCommitRequestDto,
  SyncCommitResponseDto,
  SyncActionDto,
  LocalFileDto,
  FileListResponseDto,
  CompletedFileDto,
} from './dto';

// ── 常量 ────────────────────────────────────────────────────

/** 默认分页限制 */
const DEFAULT_LIMIT = 100;
/** 最大分页限制 */
const MAX_LIMIT = 1000;

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultService: VaultService,
    private readonly quotaService: QuotaService,
    private readonly storageClient: StorageClient,
    private readonly vectorizeService: VectorizeService,
  ) {}

  /**
   * 计算同步差异
   */
  async calculateDiff(
    userId: string,
    tier: SubscriptionTier,
    dto: SyncDiffRequestDto,
  ): Promise<SyncDiffResponseDto> {
    const { vaultId, deviceId, localFiles } = dto;

    // 验证 Vault 所有权
    await this.vaultService.getVault(userId, vaultId);

    // 获取设备信息（设备名称用于冲突命名）
    const device = await this.prisma.vaultDevice.findUnique({
      where: {
        vaultId_deviceId: { vaultId, deviceId },
      },
    });
    const deviceName = device?.deviceName ?? 'Unknown Device';

    // 获取远程文件列表（包括已删除的）
    const remoteFiles = await this.prisma.syncFile.findMany({
      where: { vaultId },
      select: {
        id: true,
        path: true,
        title: true,
        size: true,
        contentHash: true,
        vectorClock: true,
        isDeleted: true,
      },
    });

    // 转换为类型安全的结构
    const remoteFilesTyped: RemoteFile[] = remoteFiles.map((f) => ({
      id: f.id,
      path: f.path,
      title: f.title,
      size: f.size,
      contentHash: f.contentHash,
      vectorClock: (f.vectorClock as VectorClock) ?? {},
      isDeleted: f.isDeleted,
    }));

    // 计算差异
    const actions = computeSyncActions(
      localFiles,
      remoteFilesTyped,
      deviceName,
    );

    // 检查上传文件的额度（包含冲突副本）
    await this.validateUploadQuota(
      userId,
      tier,
      localFiles,
      remoteFilesTyped,
      actions,
    );

    // 为需要上传/下载的文件生成预签名 URL
    const actionsWithUrls = this.generatePresignUrls(userId, vaultId, actions);

    return { actions: actionsWithUrls };
  }

  /**
   * 提交同步结果
   */
  async commitSync(
    userId: string,
    dto: SyncCommitRequestDto,
  ): Promise<SyncCommitResponseDto> {
    const { vaultId, deviceId, completed, deleted, vectorizeEnabled } = dto;

    // 验证 Vault 所有权
    await this.vaultService.getVault(userId, vaultId);

    // 乐观锁校验：检查提供了 expectedHash 的文件
    const filesWithExpectedHash = completed.filter((f) => f.expectedHash);
    if (filesWithExpectedHash.length > 0) {
      const currentFiles = await this.prisma.syncFile.findMany({
        where: {
          id: { in: filesWithExpectedHash.map((f) => f.fileId) },
          vaultId,
        },
        select: { id: true, path: true, contentHash: true },
      });

      const currentHashMap = new Map(
        currentFiles.map((f) => [f.id, { path: f.path, hash: f.contentHash }]),
      );

      const conflicts = filesWithExpectedHash
        .filter((f) => {
          const current = currentHashMap.get(f.fileId);
          return current && current.hash !== f.expectedHash;
        })
        .map((f) => {
          const current = currentHashMap.get(f.fileId)!;
          return {
            fileId: f.fileId,
            path: f.path,
            expectedHash: f.expectedHash!,
            currentHash: current.hash,
          };
        });

      if (conflicts.length > 0) {
        return {
          success: false,
          syncedAt: new Date(),
          conflicts,
        };
      }
    }

    // 从 R2 删除文件
    if (deleted.length > 0) {
      await this.storageClient.deleteFiles(userId, vaultId, deleted);
    }

    // 计算存储用量增量
    const sizeDelta = await this.calculateSizeDelta(completed, deleted);

    await this.prisma.$transaction(async (tx) => {
      // 更新或创建已完成的文件记录
      for (const file of completed) {
        // 先清理可能的路径冲突
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
            vaultId,
            path: file.path,
            title: file.title,
            size: file.size,
            contentHash: file.contentHash,
            vectorClock: file.vectorClock,
          },
          update: {
            path: file.path,
            title: file.title,
            size: file.size,
            contentHash: file.contentHash,
            vectorClock: file.vectorClock,
            isDeleted: false,
          },
        });
      }

      // 软删除文件记录
      if (deleted.length > 0) {
        await tx.syncFile.updateMany({
          where: {
            id: { in: deleted },
            vaultId,
          },
          data: {
            isDeleted: true,
          },
        });
      }

      // 更新设备最后同步时间
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

      // 增量更新用户存储用量
      await this.updateStorageUsageIncremental(tx, userId, sizeDelta);
    });

    // 向量化入队
    if (vectorizeEnabled) {
      await this.queueVectorizeFromSync(userId, vaultId, completed);
    }

    return {
      success: true,
      syncedAt: new Date(),
    };
  }

  /**
   * 获取 Vault 文件列表（支持分页）
   */
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

  // ── 私有方法 ────────────────────────────────────────────────

  /**
   * 验证上传文件的额度
   */
  private async validateUploadQuota(
    userId: string,
    tier: SubscriptionTier,
    localFiles: LocalFileDto[],
    remoteFiles: RemoteFile[],
    actions: SyncActionDto[],
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

  /**
   * 为同步操作生成预签名 URL
   */
  private generatePresignUrls(
    userId: string,
    vaultId: string,
    actions: SyncActionDto[],
  ): SyncActionDto[] {
    const needUrls = actions.filter(
      (a) =>
        a.action === 'upload' ||
        a.action === 'download' ||
        a.action === 'conflict',
    );

    if (needUrls.length === 0) return actions;

    if (!this.storageClient.isConfigured()) {
      throw new ServiceUnavailableException('Storage not configured');
    }

    const urlRequests: Array<{
      fileId: string;
      action: 'upload' | 'download';
      contentType?: string;
      filename?: string;
      size?: number;
    }> = [];

    for (const a of needUrls) {
      if (a.action === 'conflict') {
        // 下载云端版本（用于保存为冲突副本）
        urlRequests.push({
          fileId: a.fileId,
          action: 'download',
          contentType: getMimeType(a.path),
          filename: getFileName(a.path),
          size: a.size,
        });
        // 上传本地版本覆盖云端原始文件
        urlRequests.push({
          fileId: a.fileId,
          action: 'upload',
          contentType: getMimeType(a.path),
          filename: getFileName(a.path),
          size: a.size,
        });
        // 上传冲突副本到 R2（使用新的 conflictCopyId）
        if (a.conflictCopyId && a.conflictRename) {
          urlRequests.push({
            fileId: a.conflictCopyId,
            action: 'upload',
            contentType: getMimeType(a.conflictRename),
            filename: getFileName(a.conflictRename),
            size: a.size,
          });
        }
      } else {
        urlRequests.push({
          fileId: a.fileId,
          action: a.action === 'upload' ? 'upload' : 'download',
          contentType: getMimeType(a.path),
          filename: getFileName(a.path),
          size: a.size,
        });
      }
    }

    const result = this.storageClient.getBatchUrls(
      userId,
      vaultId,
      urlRequests,
    );

    const urlMap = new Map<string, string>();
    urlRequests.forEach((req, index) => {
      const url = result.urls[index]?.url;
      if (url) {
        urlMap.set(`${req.fileId}:${req.action}`, url);
      }
    });

    return actions.map((a) => {
      if (a.action === 'conflict') {
        return {
          ...a,
          url: urlMap.get(`${a.fileId}:download`),
          uploadUrl: urlMap.get(`${a.fileId}:upload`),
          conflictCopyUploadUrl: a.conflictCopyId
            ? urlMap.get(`${a.conflictCopyId}:upload`)
            : undefined,
        };
      }
      if (a.action === 'upload') {
        return { ...a, url: urlMap.get(`${a.fileId}:upload`) };
      }
      return { ...a, url: urlMap.get(`${a.fileId}:download`) };
    });
  }

  /**
   * 计算存储用量增量
   */
  private async calculateSizeDelta(
    completed: SyncCommitRequestDto['completed'],
    deleted: string[],
  ): Promise<bigint> {
    const existingFiles = await this.prisma.syncFile.findMany({
      where: { id: { in: [...completed.map((f) => f.fileId), ...deleted] } },
      select: { id: true, size: true },
    });

    const existingMap = new Map(existingFiles.map((f) => [f.id, f.size]));
    let delta = BigInt(0);

    for (const file of completed) {
      const oldSize = existingMap.get(file.fileId) ?? 0;
      delta += BigInt(file.size - oldSize);
    }

    for (const fileId of deleted) {
      const oldSize = existingMap.get(fileId) ?? 0;
      delta -= BigInt(oldSize);
    }

    return delta;
  }

  /**
   * 增量更新用户存储用量
   */
  private async updateStorageUsageIncremental(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    userId: string,
    delta: bigint,
  ): Promise<void> {
    if (delta === BigInt(0)) return;

    const current = await tx.userStorageUsage.findUnique({
      where: { userId },
      select: { storageUsed: true },
    });

    const currentUsage = current?.storageUsed ?? BigInt(0);
    const newUsage =
      currentUsage + delta < BigInt(0) ? BigInt(0) : currentUsage + delta;

    await tx.userStorageUsage.upsert({
      where: { userId },
      create: { userId, storageUsed: newUsage },
      update: { storageUsed: newUsage },
    });
  }

  /**
   * 从 sync commit 入队向量化
   */
  private async queueVectorizeFromSync(
    userId: string,
    vaultId: string,
    completed: CompletedFileDto[],
  ): Promise<void> {
    const filesToVectorize = completed
      .filter((file) => {
        if (file.action !== 'upload' && file.action !== 'conflict')
          return false;
        const isMarkdown =
          file.path.endsWith('.md') || file.path.endsWith('.markdown');
        return isMarkdown;
      })
      .map((file) => ({
        fileId: file.fileId,
        fileName: file.title,
        size: file.size,
      }));

    if (filesToVectorize.length === 0) return;

    try {
      const result = await this.vectorizeService.queueFromSync(
        userId,
        vaultId,
        filesToVectorize,
      );
      this.logger.log(
        `Vectorize from sync: queued ${result.queued}, skipped ${result.skipped}`,
      );
    } catch (error) {
      this.logger.error(`Failed to queue vectorize from sync: ${error}`);
    }
  }
}
