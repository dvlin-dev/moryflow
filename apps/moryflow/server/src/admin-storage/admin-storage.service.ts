/**
 * Admin Storage Service
 * 云同步管理业务逻辑
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma';
import { StorageClient } from '../storage/storage.client';
import { VectorizeClient } from '../vectorize/vectorize.client';
import { getQuotaConfig } from '../quota/quota.config';
import type { UserTier } from '../types';
import type {
  StorageStatsResponse,
  VaultListQuery,
  VaultListResponse,
  VaultDetailResponse,
  UserStorageListQuery,
  UserStorageListResponse,
  UserStorageDetailResponse,
  VectorizedFileListQuery,
  VectorizedFileListResponse,
} from './dto';

@Injectable()
export class AdminStorageService {
  private readonly logger = new Logger(AdminStorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageClient: StorageClient,
    private readonly vectorizeClient: VectorizeClient,
  ) {}

  /**
   * 获取云同步整体统计
   */
  async getStats(): Promise<StorageStatsResponse> {
    // 并行查询各项统计
    const [storageAgg, vaultCount, fileCount, deviceCount, vectorizedAgg] =
      await Promise.all([
        // 存储统计：总用量和用户数
        this.prisma.userStorageUsage.aggregate({
          _sum: { storageUsed: true },
          _count: { userId: true },
        }),
        // Vault 总数
        this.prisma.vault.count(),
        // 文件总数（未删除）
        this.prisma.syncFile.count({ where: { isDeleted: false } }),
        // 设备总数
        this.prisma.vaultDevice.count(),
        // 向量化统计
        this.prisma.vectorizedFile.aggregate({
          _count: { id: true },
        }),
      ]);

    // 统计使用向量化的用户数
    const vectorizedUserCount = await this.prisma.vectorizedFile.groupBy({
      by: ['userId'],
    });

    return {
      storage: {
        totalUsed: Number(storageAgg._sum.storageUsed ?? 0),
        userCount: storageAgg._count.userId,
        vaultCount,
        fileCount,
        deviceCount,
      },
      vectorize: {
        totalCount: vectorizedAgg._count.id,
        userCount: vectorizedUserCount.length,
      },
    };
  }

  /**
   * 获取 Vault 列表
   */
  async getVaultList(query: VaultListQuery): Promise<VaultListResponse> {
    const { search, userId, limit, offset } = query;

    // 构建查询条件
    const where: Prisma.VaultWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // 并行查询列表和总数
    const [vaults, total] = await Promise.all([
      this.prisma.vault.findMany({
        where,
        include: {
          user: { select: { email: true, name: true } },
          _count: { select: { files: true, devices: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.vault.count({ where }),
    ]);

    // 获取每个 Vault 的存储大小
    const vaultIds = vaults.map((v) => v.id);
    const sizeAgg = await this.prisma.syncFile.groupBy({
      by: ['vaultId'],
      where: { vaultId: { in: vaultIds }, isDeleted: false },
      _sum: { size: true },
    });

    const sizeMap = new Map(sizeAgg.map((s) => [s.vaultId, s._sum.size ?? 0]));

    return {
      vaults: vaults.map((vault) => ({
        id: vault.id,
        name: vault.name,
        userId: vault.userId,
        userEmail: vault.user.email,
        userName: vault.user.name,
        fileCount: vault._count.files,
        totalSize: sizeMap.get(vault.id) ?? 0,
        deviceCount: vault._count.devices,
        createdAt: vault.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * 获取 Vault 详情
   */
  async getVaultDetail(vaultId: string): Promise<VaultDetailResponse> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      include: {
        user: { select: { id: true, email: true, name: true, tier: true } },
        devices: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
            lastSyncAt: true,
          },
          orderBy: { lastSyncAt: 'desc' },
        },
      },
    });

    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    // 获取文件统计和最近文件
    const [fileStats, recentFiles] = await Promise.all([
      this.prisma.syncFile.aggregate({
        where: { vaultId, isDeleted: false },
        _count: { id: true },
        _sum: { size: true },
      }),
      this.prisma.syncFile.findMany({
        where: { vaultId, isDeleted: false },
        select: {
          id: true,
          path: true,
          title: true,
          size: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      vault: {
        id: vault.id,
        name: vault.name,
        userId: vault.userId,
        createdAt: vault.createdAt.toISOString(),
        user: {
          id: vault.user.id,
          email: vault.user.email,
          name: vault.user.name,
          tier: vault.user.tier,
        },
      },
      stats: {
        fileCount: fileStats._count.id,
        totalSize: fileStats._sum.size ?? 0,
        deviceCount: vault.devices.length,
      },
      devices: vault.devices.map((d) => ({
        id: d.id,
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        lastSyncAt: d.lastSyncAt?.toISOString() ?? null,
      })),
      recentFiles: recentFiles.map((f) => ({
        id: f.id,
        path: f.path,
        title: f.title,
        size: f.size,
        updatedAt: f.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * 删除 Vault（包含 R2 文件）
   */
  async deleteVault(vaultId: string): Promise<{ success: boolean }> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      include: {
        files: { select: { id: true }, where: { isDeleted: false } },
      },
    });

    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    // 删除 R2 文件
    const fileIds = vault.files.map((f) => f.id);
    if (fileIds.length > 0) {
      await this.storageClient.deleteFiles(vault.userId, vaultId, fileIds);
    }

    // 删除数据库记录（级联删除 files 和 devices）
    await this.prisma.vault.delete({ where: { id: vaultId } });

    // 重新计算用户存储用量
    await this.recalculateUserStorage(vault.userId);

    this.logger.log(`Deleted vault ${vaultId} with ${fileIds.length} files`);

    return { success: true };
  }

  /**
   * 获取用户存储列表
   */
  async getUserStorageList(
    query: UserStorageListQuery,
  ): Promise<UserStorageListResponse> {
    const { search, limit, offset } = query;

    // 查询有存储记录的用户
    const where: Prisma.UserStorageUsageWhereInput = {};

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [usages, total] = await Promise.all([
      this.prisma.userStorageUsage.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true, tier: true },
          },
        },
        orderBy: { storageUsed: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.userStorageUsage.count({ where }),
    ]);

    // 获取用户的 Vault 数量
    const userIds = usages.map((u) => u.userId);
    const vaultCounts = await this.prisma.vault.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _count: { id: true },
    });
    const vaultCountMap = new Map(
      vaultCounts.map((v) => [v.userId, v._count.id]),
    );

    return {
      users: usages.map((usage) => {
        const quota = getQuotaConfig(usage.user.tier as UserTier);
        return {
          userId: usage.userId,
          email: usage.user.email,
          name: usage.user.name,
          tier: usage.user.tier,
          storageUsed: Number(usage.storageUsed),
          storageLimit: quota.maxStorage,
          vectorizedCount: usage.vectorizedCount,
          vectorizedLimit: quota.maxVectorizedFiles,
          vaultCount: vaultCountMap.get(usage.userId) ?? 0,
        };
      }),
      total,
    };
  }

  /**
   * 获取用户存储详情
   */
  async getUserStorageDetail(
    userId: string,
  ): Promise<UserStorageDetailResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, tier: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 获取存储用量
    const usage = await this.prisma.userStorageUsage.findUnique({
      where: { userId },
    });

    // 获取用户的 Vault 列表
    const vaults = await this.prisma.vault.findMany({
      where: { userId },
      include: {
        _count: { select: { files: true, devices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 获取每个 Vault 的存储大小
    const vaultIds = vaults.map((v) => v.id);
    const sizeAgg = await this.prisma.syncFile.groupBy({
      by: ['vaultId'],
      where: { vaultId: { in: vaultIds }, isDeleted: false },
      _sum: { size: true },
    });
    const sizeMap = new Map(sizeAgg.map((s) => [s.vaultId, s._sum.size ?? 0]));

    const quota = getQuotaConfig(user.tier as UserTier);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
      usage: {
        storageUsed: Number(usage?.storageUsed ?? 0),
        storageLimit: quota.maxStorage,
        vectorizedCount: usage?.vectorizedCount ?? 0,
        vectorizedLimit: quota.maxVectorizedFiles,
      },
      vaults: vaults.map((vault) => ({
        id: vault.id,
        name: vault.name,
        fileCount: vault._count.files,
        totalSize: sizeMap.get(vault.id) ?? 0,
        deviceCount: vault._count.devices,
        createdAt: vault.createdAt.toISOString(),
      })),
    };
  }

  /**
   * 获取向量化文件列表
   */
  async getVectorizedFileList(
    query: VectorizedFileListQuery,
  ): Promise<VectorizedFileListResponse> {
    const { userId, search, limit, offset } = query;

    const where: Prisma.VectorizedFileWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [files, total] = await Promise.all([
      this.prisma.vectorizedFile.findMany({
        where,
        include: {
          user: { select: { email: true } },
        },
        orderBy: { vectorizedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.vectorizedFile.count({ where }),
    ]);

    return {
      files: files.map((f) => ({
        id: f.id,
        userId: f.userId,
        userEmail: f.user.email,
        fileId: f.fileId,
        title: f.title,
        vectorizedAt: f.vectorizedAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * 删除向量化记录
   */
  async deleteVectorizedFile(id: string): Promise<{ success: boolean }> {
    const file = await this.prisma.vectorizedFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('Vectorized file not found');
    }

    // 删除 Vectorize 中的向量
    try {
      await this.vectorizeClient.delete([file.fileId]);
    } catch (error) {
      this.logger.warn(`Failed to delete vector for ${file.fileId}`, error);
    }

    // 删除数据库记录
    await this.prisma.vectorizedFile.delete({ where: { id } });

    // 更新用量统计
    await this.prisma.userStorageUsage.update({
      where: { userId: file.userId },
      data: { vectorizedCount: { decrement: 1 } },
    });

    return { success: true };
  }

  /**
   * 重新计算用户存储用量
   */
  private async recalculateUserStorage(userId: string): Promise<void> {
    const totalSize = await this.prisma.syncFile.aggregate({
      where: {
        vault: { userId },
        isDeleted: false,
      },
      _sum: { size: true },
    });

    await this.prisma.userStorageUsage.upsert({
      where: { userId },
      update: { storageUsed: totalSize._sum.size ?? 0 },
      create: {
        userId,
        storageUsed: totalSize._sum.size ?? 0,
        vectorizedCount: 0,
      },
    });
  }
}
