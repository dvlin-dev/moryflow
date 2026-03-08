/**
 * [INPUT]: 管理端存储查询/操作请求
 * [OUTPUT]: Storage/Admin 相关统计与操作结果
 * [POS]: 云同步管理业务逻辑
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma';
import { getQuotaConfig } from '../quota/quota.config';
import type { SubscriptionTier } from '../types';
import { VaultDeletionService } from '../vault/vault-deletion.service';
import type {
  StorageStatsResponse,
  VaultListQuery,
  VaultListResponse,
  VaultDetailResponse,
  UserStorageListQuery,
  UserStorageListResponse,
  UserStorageDetailResponse,
} from './dto';

interface LiveVaultStats {
  fileCount: number;
  totalSize: number;
}

interface UserStorageListRow {
  userId: string;
  email: string;
  name: string | null;
  subscriptionTier: string | null;
  storageUsed: bigint | number | string;
  vaultCount: bigint | number | string;
}

interface CountRow {
  total: bigint | number | string;
}

const SUBSCRIPTION_TIERS: readonly SubscriptionTier[] = [
  'free',
  'starter',
  'basic',
  'pro',
];

function normalizeSubscriptionTier(
  tier: string | null | undefined,
): SubscriptionTier {
  return SUBSCRIPTION_TIERS.includes(tier as SubscriptionTier)
    ? (tier as SubscriptionTier)
    : 'free';
}

@Injectable()
export class AdminStorageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultDeletionService: VaultDeletionService,
  ) {}

  /**
   * 获取云同步整体统计
   */
  async getStats(): Promise<StorageStatsResponse> {
    const [storageAgg, activeUsers, vaultCount, fileCount, deviceCount] =
      await Promise.all([
        this.prisma.syncFile.aggregate({
          where: { isDeleted: false },
          _sum: { size: true },
        }),
        this.prisma.vault.groupBy({
          by: ['userId'],
        }),
        this.prisma.vault.count(),
        this.prisma.syncFile.count({ where: { isDeleted: false } }),
        this.prisma.vaultDevice.count(),
      ]);

    return {
      storage: {
        totalUsed: Number(storageAgg._sum.size ?? 0),
        userCount: activeUsers.length,
        vaultCount,
        fileCount,
        deviceCount,
      },
    };
  }

  /**
   * 获取 Vault 列表
   */
  async getVaultList(query: VaultListQuery): Promise<VaultListResponse> {
    const { search, userId, limit, offset } = query;

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

    const [vaults, total] = await Promise.all([
      this.prisma.vault.findMany({
        where,
        include: {
          user: { select: { email: true, name: true } },
          _count: { select: { devices: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.vault.count({ where }),
    ]);

    const liveStatsMap = await this.loadLiveVaultStatsMap(
      vaults.map((vault) => vault.id),
    );

    return {
      vaults: vaults.map((vault) => {
        const liveStats = liveStatsMap.get(vault.id) ?? {
          fileCount: 0,
          totalSize: 0,
        };
        return {
          id: vault.id,
          name: vault.name,
          userId: vault.userId,
          userEmail: vault.user.email,
          userName: vault.user.name,
          fileCount: liveStats.fileCount,
          totalSize: liveStats.totalSize,
          deviceCount: vault._count.devices,
          createdAt: vault.createdAt.toISOString(),
        };
      }),
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
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            subscription: { select: { tier: true } },
          },
        },
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
          subscriptionTier: vault.user.subscription?.tier ?? 'free',
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
   * 删除 Vault（统一复用正式 teardown 链路）
   */
  async deleteVault(vaultId: string): Promise<void> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      select: { id: true },
    });

    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    await this.vaultDeletionService.deleteVault(vaultId);
  }

  /**
   * 获取用户存储列表
   */
  async getUserStorageList(
    query: UserStorageListQuery,
  ): Promise<UserStorageListResponse> {
    const { search, limit, offset } = query;
    const normalizedSearch = search?.trim() ?? '';
    const searchPattern = `%${normalizedSearch}%`;
    const searchFilter =
      normalizedSearch.length > 0
        ? Prisma.sql`AND (u.email ILIKE ${searchPattern} OR u.name ILIKE ${searchPattern})`
        : Prisma.empty;

    const [users, totalRows] = await Promise.all([
      this.prisma.$queryRaw<UserStorageListRow[]>(Prisma.sql`
        SELECT
          u.id AS "userId",
          u.email AS "email",
          u.name AS "name",
          s.tier AS "subscriptionTier",
          COALESCE(usu."storageUsed", 0) AS "storageUsed",
          COUNT(DISTINCT v.id) AS "vaultCount"
        FROM "User" u
        INNER JOIN "Vault" v ON v."userId" = u.id
        LEFT JOIN "Subscription" s ON s."userId" = u.id
        LEFT JOIN "UserStorageUsage" usu ON usu."userId" = u.id
        WHERE 1 = 1
        ${searchFilter}
        GROUP BY u.id, u.email, u.name, s.tier, usu."storageUsed"
        ORDER BY COALESCE(usu."storageUsed", 0) DESC, u.email ASC
        OFFSET ${offset}
        LIMIT ${limit}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) AS "total"
        FROM "User" u
        WHERE EXISTS (
          SELECT 1
          FROM "Vault" v
          WHERE v."userId" = u.id
        )
        ${
          normalizedSearch.length > 0
            ? Prisma.sql`AND (u.email ILIKE ${searchPattern} OR u.name ILIKE ${searchPattern})`
            : Prisma.empty
        }
      `),
    ]);
    const total = Number(totalRows[0]?.total ?? 0);

    if (users.length === 0) {
      return {
        users: [],
        total,
      };
    }

    return {
      users: users.map((user) => {
        const tier = normalizeSubscriptionTier(user.subscriptionTier);
        const quota = getQuotaConfig(tier);
        return {
          userId: user.userId,
          email: user.email,
          name: user.name,
          subscriptionTier: tier,
          storageUsed: Number(user.storageUsed ?? 0),
          storageLimit: quota.maxStorage,
          vaultCount: Number(user.vaultCount ?? 0),
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
      select: {
        id: true,
        email: true,
        name: true,
        subscription: { select: { tier: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [usage, vaults] = await Promise.all([
      this.prisma.userStorageUsage.findUnique({
        where: { userId },
      }),
      this.prisma.vault.findMany({
        where: { userId },
        include: {
          _count: { select: { devices: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const liveStatsMap = await this.loadLiveVaultStatsMap(
      vaults.map((vault) => vault.id),
    );

    const tier = user.subscription?.tier ?? 'free';
    const quota = getQuotaConfig(tier);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: tier,
      },
      usage: {
        storageUsed: Number(usage?.storageUsed ?? 0),
        storageLimit: quota.maxStorage,
      },
      vaults: vaults.map((vault) => {
        const liveStats = liveStatsMap.get(vault.id) ?? {
          fileCount: 0,
          totalSize: 0,
        };
        return {
          id: vault.id,
          name: vault.name,
          fileCount: liveStats.fileCount,
          totalSize: liveStats.totalSize,
          deviceCount: vault._count.devices,
          createdAt: vault.createdAt.toISOString(),
        };
      }),
    };
  }

  private async loadLiveVaultStatsMap(
    vaultIds: string[],
  ): Promise<Map<string, LiveVaultStats>> {
    if (vaultIds.length === 0) {
      return new Map();
    }

    const aggregates = await this.prisma.syncFile.groupBy({
      by: ['vaultId'],
      where: { vaultId: { in: vaultIds }, isDeleted: false },
      _count: { id: true },
      _sum: { size: true },
    });

    return new Map(
      aggregates.map((item) => [
        item.vaultId,
        {
          fileCount: item._count.id,
          totalSize: item._sum.size ?? 0,
        },
      ]),
    );
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
      },
    });
  }
}
