/**
 * [INPUT]: 用户等级/用量数据/文件大小
 * [OUTPUT]: 用量统计与额度判断结果
 * [POS]: 配额核心逻辑
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type { UserTier } from '../types';
import { getQuotaConfig } from './quota.config';
import type {
  UsageResponseDto,
  QuotaCheckResult,
  StorageUsageDto,
  VectorizedUsageDto,
} from './dto';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户完整用量信息
   */
  async getUsage(userId: string, tier: UserTier): Promise<UsageResponseDto> {
    const config = getQuotaConfig(tier);
    const usage = await this.getOrCreateUsage(userId);

    const storageUsed = Number(usage.storageUsed);
    const storagePercentage =
      config.maxStorage > 0
        ? Math.round((storageUsed / config.maxStorage) * 100)
        : 0;

    const vectorizedPercentage =
      config.maxVectorizedFiles > 0
        ? Math.round((usage.vectorizedCount / config.maxVectorizedFiles) * 100)
        : 0;

    return {
      storage: {
        used: storageUsed,
        limit: config.maxStorage,
        percentage: Math.min(storagePercentage, 100),
      },
      vectorized: {
        count: usage.vectorizedCount,
        limit: config.maxVectorizedFiles,
        percentage: Math.min(vectorizedPercentage, 100),
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
    tier: UserTier,
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
   * 获取向量化用量
   */
  async getVectorizedUsage(
    userId: string,
    tier: UserTier,
  ): Promise<VectorizedUsageDto> {
    const config = getQuotaConfig(tier);
    const usage = await this.getOrCreateUsage(userId);

    const percentage =
      config.maxVectorizedFiles > 0
        ? Math.round((usage.vectorizedCount / config.maxVectorizedFiles) * 100)
        : 0;

    return {
      count: usage.vectorizedCount,
      limit: config.maxVectorizedFiles,
      percentage: Math.min(percentage, 100),
    };
  }

  /**
   * 检查是否可以上传文件
   */
  async checkUploadAllowed(
    userId: string,
    tier: UserTier,
    fileSize: number,
  ): Promise<QuotaCheckResult> {
    const config = getQuotaConfig(tier);

    // 检查单文件大小
    if (fileSize > config.maxFileSize) {
      return {
        allowed: false,
        reason: `File size ${this.formatBytes(fileSize)} exceeds limit ${this.formatBytes(config.maxFileSize)}`,
        currentUsage: fileSize,
        limit: config.maxFileSize,
      };
    }

    // 检查总存储空间
    const usage = await this.getOrCreateUsage(userId);
    const currentStorage = Number(usage.storageUsed);
    const newStorage = currentStorage + fileSize;

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
   * 检查是否可以向量化文件
   * @param userId 用户 ID
   * @param tier 用户等级
   * @param count 即将新增的向量化文件数（默认为 1）
   */
  async checkVectorizeAllowed(
    userId: string,
    tier: UserTier,
    count: number = 1,
  ): Promise<QuotaCheckResult> {
    const config = getQuotaConfig(tier);
    const usage = await this.getOrCreateUsage(userId);

    const remaining = config.maxVectorizedFiles - usage.vectorizedCount;
    if (remaining < count) {
      return {
        allowed: false,
        reason: `Vectorization quota exceeded. Current: ${usage.vectorizedCount}, Limit: ${config.maxVectorizedFiles}, Requested: ${count}`,
        currentUsage: usage.vectorizedCount,
        limit: config.maxVectorizedFiles,
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
   * 增加向量化计数
   */
  async incrementVectorizedCount(userId: string): Promise<void> {
    await this.prisma.userStorageUsage.upsert({
      where: { userId },
      create: {
        userId,
        vectorizedCount: 1,
      },
      update: {
        vectorizedCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * 减少向量化计数
   */
  async decrementVectorizedCount(userId: string): Promise<void> {
    await this.getOrCreateUsage(userId);
    await this.prisma.$executeRaw`
      UPDATE "UserStorageUsage"
      SET "vectorizedCount" = GREATEST("vectorizedCount" - 1, 0)
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
   * 重新计算向量化文件数
   */
  async recalculateVectorizedCount(userId: string): Promise<void> {
    const count = await this.prisma.vectorizedFile.count({
      where: { userId },
    });

    await this.prisma.userStorageUsage.upsert({
      where: { userId },
      create: {
        userId,
        vectorizedCount: count,
      },
      update: {
        vectorizedCount: count,
      },
    });
  }

  /**
   * 获取或创建用量记录
   * 使用 upsert 确保并发安全
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
