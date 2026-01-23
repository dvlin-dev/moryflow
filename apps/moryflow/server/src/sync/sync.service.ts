/**
 * [INPUT]: (SyncDiffRequest, SyncCommitRequest) - 本地文件清单与同步提交请求
 * [OUTPUT]: (SyncActions[], 预签名URL) - 同步指令与 R2 上传/下载链接
 * [POS]: 云同步核心服务，基于向量时钟实现双向差异计算、冲突解决
 * [DOC]: docs/products/moryflow/research/sync-refactor-proposal.md
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import {
  compareVectorClocks,
  type VectorClock,
  type ClockRelation,
} from '@anyhunt/sync';
import { PrismaService } from '../prisma';
import { VaultService } from '../vault';
import { QuotaService } from '../quota';
import { StorageClient } from '../storage';
import { VectorizeService } from '../vectorize';
import { getMimeType, getFileName } from '../storage/mime-utils';
import type { SubscriptionTier, PaginationParams } from '../types';
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

// ── 类型定义 ────────────────────────────────────────────────

/** 远端文件类型（用于 diff 计算） */
interface RemoteFile {
  id: string;
  path: string;
  title: string;
  size: number;
  contentHash: string;
  vectorClock: VectorClock;
  isDeleted: boolean;
}

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

    // 检查上传文件的额度
    await this.validateUploadQuota(userId, tier, localFiles);

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
    const actions = this.computeDiff(localFiles, remoteFilesTyped, deviceName);

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
  ): Promise<void> {
    // 过滤掉删除操作（contentHash 为空）
    const filesToUpload = localFiles.filter((f) => f.contentHash !== '');
    if (filesToUpload.length === 0) return;

    // 检查最大单文件
    const maxFile = filesToUpload.reduce((max, file) =>
      file.size > max.size ? file : max,
    );

    const singleFileCheck = await this.quotaService.checkUploadAllowed(
      userId,
      tier,
      maxFile.size,
    );
    if (!singleFileCheck.allowed) {
      throw new ForbiddenException(
        `File "${maxFile.path}" exceeds size limit: ${singleFileCheck.reason}`,
      );
    }

    // 计算增量存储
    const existingFiles = await this.prisma.syncFile.findMany({
      where: { id: { in: filesToUpload.map((f) => f.fileId) } },
      select: { id: true, size: true },
    });

    const existingMap = new Map(existingFiles.map((f) => [f.id, f.size]));

    let totalNewSize = 0;
    for (const file of filesToUpload) {
      const existingSize = existingMap.get(file.fileId) ?? 0;
      const sizeDiff = file.size - existingSize;
      if (sizeDiff > 0) totalNewSize += sizeDiff;
    }

    if (totalNewSize > 0) {
      const storageCheck = await this.quotaService.checkUploadAllowed(
        userId,
        tier,
        totalNewSize,
      );
      if (!storageCheck.allowed) {
        throw new ForbiddenException(
          `Storage quota exceeded: ${storageCheck.reason}`,
        );
      }
    }
  }

  /**
   * 计算同步差异（基于向量时钟）
   */
  private computeDiff(
    localFiles: LocalFileDto[],
    remoteFiles: RemoteFile[],
    deviceName: string,
  ): SyncActionDto[] {
    const actions: SyncActionDto[] = [];
    const localMap = new Map(localFiles.map((f) => [f.fileId, f]));
    const remoteMap = new Map(remoteFiles.map((f) => [f.id, f]));

    // 1. 处理本地存在的文件
    for (const local of localFiles) {
      const remote = remoteMap.get(local.fileId);
      const action = this.resolveFile(local, remote, deviceName);
      if (action) actions.push(action);
    }

    // 2. 处理远端有、本地无的文件（远端新增）
    for (const remote of remoteFiles) {
      if (!localMap.has(remote.id) && !remote.isDeleted) {
        actions.push(this.createDownloadAction(remote));
      }
    }

    return actions;
  }

  /**
   * 解析单个文件的同步操作
   */
  private resolveFile(
    local: LocalFileDto,
    remote: RemoteFile | undefined,
    deviceName: string,
  ): SyncActionDto | null {
    const isLocalDeleted = local.contentHash === '';

    // Case 1: 本地新增（远端不存在）
    if (!remote) {
      return isLocalDeleted ? null : this.createUploadAction(local);
    }

    const isRemoteDeleted = remote.isDeleted;
    const relation = compareVectorClocks(local.vectorClock, remote.vectorClock);

    // Case 2: 双方都删除
    if (isLocalDeleted && isRemoteDeleted) {
      return null;
    }

    // Case 3: 本地删除，远端存在
    if (isLocalDeleted && !isRemoteDeleted) {
      return this.resolveLocalDeleted(local, remote, relation);
    }

    // Case 4: 远端删除，本地存在
    if (!isLocalDeleted && isRemoteDeleted) {
      return this.resolveRemoteDeleted(local, remote, relation);
    }

    // Case 5: 双方都存在
    return this.resolveBothExist(local, remote, relation, deviceName);
  }

  /**
   * 本地删除，远端存在
   */
  private resolveLocalDeleted(
    local: LocalFileDto,
    remote: RemoteFile,
    relation: ClockRelation,
  ): SyncActionDto {
    switch (relation) {
      case 'after':
        // 本地删除更新 → 执行删除
        return { fileId: local.fileId, path: local.path, action: 'delete' };

      case 'before':
        // 远端有新版本 → 恢复文件
        return this.createDownloadAction(remote);

      case 'concurrent':
        // 并发：本地删除 vs 远端修改 → 保留远端（修改优先于删除）
        return this.createDownloadAction(remote);

      case 'equal':
        // 异常状态
        this.logger.error(
          `Invalid state: equal clock but different delete status: ${local.fileId}`,
        );
        return this.createDownloadAction(remote);

      default: {
        const _exhaustive: never = relation;
        throw new Error(`Unknown clock relation: ${String(_exhaustive)}`);
      }
    }
  }

  /**
   * 远端删除，本地存在
   */
  private resolveRemoteDeleted(
    local: LocalFileDto,
    remote: RemoteFile,
    relation: ClockRelation,
  ): SyncActionDto {
    switch (relation) {
      case 'after':
        // 本地有新修改 → 恢复上传
        return this.createUploadAction(local);

      case 'before':
        // 远端删除更新 → 执行删除
        return { fileId: local.fileId, path: local.path, action: 'delete' };

      case 'concurrent':
        // 并发：本地修改 vs 远端删除 → 保留本地（修改优先于删除）
        return this.createUploadAction(local);

      case 'equal':
        // 异常状态
        this.logger.error(
          `Invalid state: equal clock but different delete status: ${local.fileId}`,
        );
        return { fileId: local.fileId, path: local.path, action: 'delete' };

      default: {
        const _exhaustive: never = relation;
        throw new Error(`Unknown clock relation: ${String(_exhaustive)}`);
      }
    }
  }

  /**
   * 双方都存在
   */
  private resolveBothExist(
    local: LocalFileDto,
    remote: RemoteFile,
    relation: ClockRelation,
    deviceName: string,
  ): SyncActionDto | null {
    // 内容相同
    if (local.contentHash === remote.contentHash) {
      // 路径不同且本地更新 → 上传（更新路径）
      if (local.path !== remote.path && relation === 'after') {
        return this.createUploadAction(local);
      }
      return null;
    }

    // 内容不同
    switch (relation) {
      case 'after':
        return this.createUploadAction(local);

      case 'before':
        return this.createDownloadAction(remote);

      case 'equal':
        // 时钟相等但内容不同，异常情况
        this.logger.warn(`Clock equal but content differs: ${local.fileId}`);
        return this.createConflictAction(local, remote, deviceName);

      case 'concurrent':
        return this.createConflictAction(local, remote, deviceName);

      default: {
        const _exhaustive: never = relation;
        throw new Error(`Unknown clock relation: ${String(_exhaustive)}`);
      }
    }
  }

  private createUploadAction(local: LocalFileDto): SyncActionDto {
    return {
      fileId: local.fileId,
      path: local.path,
      action: 'upload',
      size: local.size,
      contentHash: local.contentHash,
    };
  }

  private createDownloadAction(remote: RemoteFile): SyncActionDto {
    return {
      fileId: remote.id,
      path: remote.path,
      action: 'download',
      size: remote.size,
      contentHash: remote.contentHash,
      remoteVectorClock: remote.vectorClock,
    };
  }

  private createConflictAction(
    local: LocalFileDto,
    remote: RemoteFile,
    deviceName: string,
  ): SyncActionDto {
    return {
      fileId: local.fileId,
      path: local.path,
      action: 'conflict',
      size: remote.size,
      contentHash: remote.contentHash,
      remoteVectorClock: remote.vectorClock,
      conflictRename: this.generateConflictName(remote.path, deviceName),
      // 服务端生成冲突副本的 fileId，确保客户端和服务端使用相同的 ID
      conflictCopyId: crypto.randomUUID(),
    };
  }

  /**
   * 生成冲突文件名
   */
  private generateConflictName(path: string, deviceName: string): string {
    const lastSlashIndex = path.lastIndexOf('/');
    const dir =
      lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex + 1) : '';
    const fileName =
      lastSlashIndex !== -1 ? path.substring(lastSlashIndex + 1) : path;

    const lastDotIndex = fileName.lastIndexOf('.');
    const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
    const base =
      lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

    const truncatedDeviceName =
      deviceName.length > 30 ? deviceName.substring(0, 30) + '...' : deviceName;

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return `${dir}${base} (${truncatedDeviceName} - ${timestamp})${ext}`;
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
