/**
 * ActivityLog Service
 * 活动日志核心服务
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVITY_CATEGORY,
  ACTIVITY_LEVEL,
  MAX_DETAILS_SIZE,
  type ActivityCategory,
  type ActivityLevel,
} from './constants';
import type { ActivityLogQueryDto } from './dto/activity-log.dto';

/** 日志记录参数 */
export interface LogParams {
  userId: string;
  targetUserId?: string;
  category: ActivityCategory;
  action: string;
  level?: ActivityLevel;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  duration?: number;
}

/** 存储统计 */
export interface StorageStats {
  totalCount: number;
  estimatedSizeMB: number;
  oldestLogDate: string | null;
  countByCategory: Record<string, number>;
  countByLevel: Record<string, number>;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== 日志记录 ====================

  /**
   * 记录活动日志
   */
  async log(params: LogParams): Promise<void> {
    try {
      // 1. 处理 details - 限制大小 + 脱敏
      const processedDetails = this.processDetails(params.details);

      // 2. 写入数据库
      await this.prisma.activityLog.create({
        data: {
          userId: params.userId,
          targetUserId: params.targetUserId,
          category: params.category,
          action: params.action,
          level: params.level ?? ACTIVITY_LEVEL.INFO,
          details: processedDetails as object | undefined,
          ip: params.ip,
          userAgent: params.userAgent,
          duration: params.duration,
        },
      });
    } catch (error) {
      // 日志记录失败不应影响业务流程，仅记录错误
      this.logger.error('Failed to log activity', error);
    }
  }

  // ==================== 便捷方法 ====================

  /** 记录登录事件 */
  async logLogin(
    userId: string,
    ip?: string,
    userAgent?: string,
    success = true,
  ) {
    await this.log({
      userId,
      category: ACTIVITY_CATEGORY.AUTH,
      action: success ? 'login' : 'login_failed',
      level: success ? ACTIVITY_LEVEL.INFO : ACTIVITY_LEVEL.WARN,
      ip,
      userAgent,
    });
  }

  /** 记录注册事件 */
  async logRegister(userId: string, email: string, ip?: string) {
    await this.log({
      userId,
      category: ACTIVITY_CATEGORY.AUTH,
      action: 'register',
      details: { email },
      ip,
    });
  }

  /** 记录登出事件 */
  async logLogout(userId: string, ip?: string) {
    await this.log({
      userId,
      category: ACTIVITY_CATEGORY.AUTH,
      action: 'logout',
      ip,
    });
  }

  /** 记录 AI 对话 */
  async logAiChat(
    userId: string,
    details: {
      model: string;
      inputTokens: number;
      outputTokens: number;
      creditsConsumed: number;
    },
    duration?: number,
  ) {
    await this.log({
      userId,
      category: ACTIVITY_CATEGORY.AI,
      action: 'chat',
      details,
      duration,
    });
  }

  /** 记录语音转写 */
  async logSpeechTranscribe(
    userId: string,
    details: {
      durationMs?: number;
      fileSizeBytes: number;
      language?: string;
    },
    duration?: number,
  ) {
    await this.log({
      userId,
      category: ACTIVITY_CATEGORY.AI,
      action: 'speech_transcribe',
      details,
      duration,
    });
  }

  /** 记录图片生成 */
  async logImageGeneration(
    userId: string,
    details: {
      model: string;
      imageCount: number;
      creditsConsumed: number;
      duration?: number;
    },
  ) {
    await this.log({
      userId,
      category: ACTIVITY_CATEGORY.AI,
      action: 'image_generation',
      details,
      duration: details.duration,
    });
  }

  /** 记录管理员操作（兼容原 AdminLog） */
  async logAdminAction(params: {
    operatorId: string;
    action: string;
    targetUserId?: string;
    details: Record<string, unknown>;
  }) {
    await this.log({
      userId: params.operatorId,
      targetUserId: params.targetUserId,
      category: ACTIVITY_CATEGORY.ADMIN,
      action: params.action,
      details: params.details,
    });
  }

  // ==================== 查询方法 ====================

  /**
   * 查询日志列表
   */
  async query(params: ActivityLogQueryDto) {
    const where = this.buildWhereClause(params);

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true } },
          targetUser: { select: { email: true } },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.user.email,
        targetUserId: log.targetUserId,
        targetUserEmail: log.targetUser?.email,
        category: log.category,
        action: log.action,
        level: log.level,
        details: log.details,
        ip: log.ip,
        userAgent: log.userAgent,
        duration: log.duration,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        total,
        limit: params.limit,
        offset: params.offset,
      },
    };
  }

  /**
   * 获取存储统计
   */
  async getStorageStats(): Promise<StorageStats> {
    const [totalCount, oldestLog, categoryStats, levelStats] =
      await Promise.all([
        this.prisma.activityLog.count(),
        this.prisma.activityLog.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
        this.prisma.activityLog.groupBy({
          by: ['category'],
          _count: true,
        }),
        this.prisma.activityLog.groupBy({
          by: ['level'],
          _count: true,
        }),
      ]);

    // 估算存储大小（平均每条记录约 500 字节）
    const estimatedSizeMB = (totalCount * 500) / (1024 * 1024);

    const countByCategory: Record<string, number> = {};
    for (const stat of categoryStats) {
      countByCategory[stat.category] = stat._count;
    }

    const countByLevel: Record<string, number> = {};
    for (const stat of levelStats) {
      countByLevel[stat.level] = stat._count;
    }

    return {
      totalCount,
      estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
      oldestLogDate: oldestLog?.createdAt.toISOString() ?? null,
      countByCategory,
      countByLevel,
    };
  }

  /**
   * 清理旧日志
   */
  async deleteOlderThan(days: number): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.activityLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    this.logger.log(
      `Deleted ${result.count} logs older than ${days} days (before ${cutoffDate.toISOString()})`,
    );

    return { deletedCount: result.count };
  }

  /**
   * 导出日志（返回数据数组）
   */
  async exportLogs(
    params: Omit<ActivityLogQueryDto, 'limit' | 'offset'>,
  ): Promise<unknown[]> {
    const where = this.buildWhereClause({ ...params, limit: 10000, offset: 0 });

    const logs = await this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // 限制导出数量
      include: {
        user: { select: { email: true } },
        targetUser: { select: { email: true } },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.user.email,
      targetUserId: log.targetUserId,
      targetUserEmail: log.targetUser?.email,
      category: log.category,
      action: log.action,
      level: log.level,
      details: log.details,
      ip: log.ip,
      userAgent: log.userAgent,
      duration: log.duration,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  // ==================== 内部方法 ====================

  /**
   * 处理 details - 限制大小 + 脱敏
   */
  private processDetails(
    details?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!details) return undefined;

    // 脱敏：移除 password 字段
    const sanitized = this.sanitize(details);

    // 限制大小
    const json = JSON.stringify(sanitized);
    if (json.length <= MAX_DETAILS_SIZE) {
      return sanitized;
    }

    // 超过大小限制，只保留基本信息
    return {
      _truncated: true,
      _originalSize: json.length,
      _message: 'Details too large, content omitted',
    };
  }

  /**
   * 脱敏处理
   */
  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // 跳过密码字段
      if (key.toLowerCase().includes('password')) {
        result[key] = '[REDACTED]';
        continue;
      }

      // 递归处理嵌套对象
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 构建查询条件
   */
  private buildWhereClause(params: ActivityLogQueryDto) {
    const where: Record<string, unknown> = {};

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.email) {
      where.user = {
        email: { contains: params.email, mode: 'insensitive' },
      };
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.action) {
      where.action = params.action;
    }

    if (params.level) {
      where.level = params.level;
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(
          params.startDate,
        );
      }
      if (params.endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(
          params.endDate,
        );
      }
    }

    return where;
  }
}
