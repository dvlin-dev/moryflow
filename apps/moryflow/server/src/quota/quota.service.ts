/**
 * [INPUT]: 用户等级/用量数据/文件大小
 * [OUTPUT]: 用量统计与额度判断结果
 * [POS]: 配额核心逻辑
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type { SubscriptionTier } from '../types';
import { getQuotaConfig } from './quota.config';
import type {
  UsageResponseDto,
  QuotaCheckResult,
  StorageUsageDto,
} from './dto';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户完整用量信息
   */
  async getUsage(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<UsageResponseDto> {
    const config = getQuotaConfig(tier);
    const usage = await this.getOrCreateUsage(userId);

    const storageUsed = Number(usage.storageUsed);
    const storagePercentage =
      config.maxStorage > 0
        ? Math.round((storageUsed / config.maxStorage) * 100)
        : 0;

    return {
      storage: {
        used: storageUsed,
        limit: config.maxStorage,
        percentage: Math.min(storagePercentage, 100),
      },
      fileLimit: {
        maxFileSize: config.maxFileSize,
      },
      plan: tier,
    };
  }

  /**
   * 获取存储用量
   */
  async getStorageUsage(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<StorageUsageDto> {
    const config = getQuotaConfig(tier);
    const usage = await this.getOrCreateUsage(userId);

    const storageUsed = Number(usage.storageUsed);
    const percentage =
      config.maxStorage > 0
        ? Math.round((storageUsed / config.maxStorage) * 100)
        : 0;

    return {
      used: storageUsed,
      limit: config.maxStorage,
      percentage: Math.min(percentage, 100),
    };
  }

  /**
   * 检查单文件大小限制
   */
  checkFileSizeAllowed(
    tier: SubscriptionTier,
    fileSize: number,
  ): QuotaCheckResult {
    const config = getQuotaConfig(tier);

    if (fileSize > config.maxFileSize) {
      return {
        allowed: false,
        reason: `File size ${this.formatBytes(fileSize)} exceeds limit ${this.formatBytes(config.maxFileSize)}`,
        currentUsage: fileSize,
        limit: config.maxFileSize,
      };
    }

    return { allowed: true };
  }

  /**
   * 检查总存储空间（按增量）
   */
  async checkStorageAllowed(
    userId: string,
    tier: SubscriptionTier,
    sizeDelta: number,
  ): Promise<QuotaCheckResult> {
    if (sizeDelta <= 0) {
      return { allowed: true };
    }

    const config = getQuotaConfig(tier);
    const usage = await this.getOrCreateUsage(userId);
    const currentStorage = Number(usage.storageUsed);
    const newStorage = currentStorage + sizeDelta;

    if (newStorage > config.maxStorage) {
      return {
        allowed: false,
        reason: `Storage quota exceeded. Used: ${this.formatBytes(currentStorage)}, Limit: ${this.formatBytes(config.maxStorage)}`,
        currentUsage: currentStorage,
        limit: config.maxStorage,
      };
    }

    return { allowed: true };
  }

  /**
   * 增加存储用量
   */
  async incrementStorageUsage(userId: string, bytes: number): Promise<void> {
    await this.prisma.userStorageUsage.upsert({
      where: { userId },
      create: {
        userId,
        storageUsed: BigInt(bytes),
      },
      update: {
        storageUsed: {
          increment: BigInt(bytes),
        },
      },
    });
  }

  /**
   * 减少存储用量
   */
  async decrementStorageUsage(userId: string, bytes: number): Promise<void> {
    await this.getOrCreateUsage(userId);
    await this.prisma.$executeRaw`
      UPDATE "UserStorageUsage"
      SET "storageUsed" = GREATEST("storageUsed" - ${BigInt(bytes)}, 0::bigint)
      WHERE "userId" = ${userId}
    `;
  }

  /**
   * 重新计算用户存储用量（基于实际文件）
   */
  async recalculateStorageUsage(userId: string): Promise<void> {
    const result = await this.prisma.syncFile.aggregate({
      where: {
        vault: { userId },
        isDeleted: false,
      },
      _sum: { size: true },
    });

    const storageUsed = BigInt(result._sum.size ?? 0);

    await this.prisma.userStorageUsage.upsert({
      where: { userId },
      create: {
        userId,
        storageUsed,
      },
      update: {
        storageUsed,
      },
    });
  }

  /**
   * 获取或创建用量记录
   * 使用 upsert 确保并发安全。
   * 注意：该表只表达配额缓存，不表达用户是否已经真实启用云同步。
   */
  private async getOrCreateUsage(userId: string) {
    return this.prisma.userStorageUsage.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
  }
}
