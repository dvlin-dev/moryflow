/**
 * Alert Service
 * 告警规则管理服务
 *
 * [PROVIDES]: 告警规则 CRUD、告警历史查询
 * [DEPENDS]: PrismaService
 * [POS]: 管理告警规则和历史记录
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AlertRuleType,
  AlertLevel,
  type AlertRule,
  type AlertHistory,
} from '../../generated/prisma/client';
import type {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AlertRuleCondition,
  AlertRuleAction,
} from './dto';

@Injectable()
export class AlertService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 规则管理
  // ==========================================

  /**
   * 创建告警规则
   */
  async createRule(dto: CreateAlertRuleDto): Promise<AlertRule> {
    return this.prisma.alertRule.create({
      data: {
        name: dto.name,
        type: dto.type,
        level: dto.level ?? AlertLevel.warning,
        condition: dto.condition as object,
        actions: dto.actions as object[],
        cooldown: dto.cooldown ?? 3600,
        enabled: dto.enabled ?? true,
      },
    });
  }

  /**
   * 更新告警规则
   */
  async updateRule(id: string, dto: UpdateAlertRuleDto): Promise<AlertRule> {
    const rule = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Alert rule ${id} not found`);
    }

    return this.prisma.alertRule.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        level: dto.level,
        condition: dto.condition as object | undefined,
        actions: dto.actions as object[] | undefined,
        cooldown: dto.cooldown,
        enabled: dto.enabled,
      },
    });
  }

  /**
   * 删除告警规则
   */
  async deleteRule(id: string): Promise<void> {
    await this.prisma.alertRule.delete({ where: { id } });
  }

  /**
   * 获取所有规则
   */
  async getRules(options?: {
    type?: AlertRuleType;
    enabled?: boolean;
  }): Promise<AlertRule[]> {
    const where: Record<string, unknown> = {};

    if (options?.type) {
      where.type = options.type;
    }
    if (options?.enabled !== undefined) {
      where.enabled = options.enabled;
    }

    return this.prisma.alertRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取单个规则
   */
  async getRule(id: string): Promise<AlertRule | null> {
    return this.prisma.alertRule.findUnique({ where: { id } });
  }

  /**
   * 获取启用的规则
   */
  async getEnabledRules(): Promise<AlertRule[]> {
    return this.prisma.alertRule.findMany({
      where: { enabled: true },
      orderBy: { type: 'asc' },
    });
  }

  // ==========================================
  // 告警历史
  // ==========================================

  /**
   * 创建告警历史
   */
  async createHistory(
    ruleId: string,
    level: AlertLevel,
    context: Record<string, unknown>,
  ): Promise<AlertHistory> {
    return this.prisma.alertHistory.create({
      data: {
        ruleId,
        level,
        context: context as object,
      },
    });
  }

  /**
   * 获取告警历史
   */
  async getHistory(options?: {
    ruleId?: string;
    level?: AlertLevel;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ history: AlertHistory[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (options?.ruleId) {
      where.ruleId = options.ruleId;
    }
    if (options?.level) {
      where.level = options.level;
    }
    if (options?.startDate || options?.endDate) {
      where.triggeredAt = {};
      if (options?.startDate) {
        (where.triggeredAt as Record<string, Date>).gte = options.startDate;
      }
      if (options?.endDate) {
        (where.triggeredAt as Record<string, Date>).lte = options.endDate;
      }
    }

    const [history, total] = await Promise.all([
      this.prisma.alertHistory.findMany({
        where,
        include: {
          rule: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { triggeredAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      this.prisma.alertHistory.count({ where }),
    ]);

    return { history, total };
  }

  /**
   * 检查规则是否在冷却期内
   */
  async isInCooldown(
    ruleId: string,
    cooldownSeconds: number,
  ): Promise<boolean> {
    const cooldownStart = new Date();
    cooldownStart.setSeconds(cooldownStart.getSeconds() - cooldownSeconds);

    const recentAlert = await this.prisma.alertHistory.findFirst({
      where: {
        ruleId,
        triggeredAt: { gte: cooldownStart },
      },
    });

    return !!recentAlert;
  }

  /**
   * 获取告警统计
   */
  async getStats(days: number = 7): Promise<{
    total: number;
    byLevel: { warning: number; critical: number };
    byType: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, byLevel, byType] = await Promise.all([
      this.prisma.alertHistory.count({
        where: { triggeredAt: { gte: startDate } },
      }),
      this.prisma.alertHistory.groupBy({
        by: ['level'],
        where: { triggeredAt: { gte: startDate } },
        _count: true,
      }),
      this.prisma.$queryRaw<Array<{ type: string; count: bigint }>>`
        SELECT r.type, COUNT(*) as count
        FROM "AlertHistory" h
        JOIN "AlertRule" r ON h."ruleId" = r.id
        WHERE h."triggeredAt" >= ${startDate}
        GROUP BY r.type
      `,
    ]);

    const levelMap: { warning: number; critical: number } = {
      warning: 0,
      critical: 0,
    };
    for (const item of byLevel) {
      levelMap[item.level as 'warning' | 'critical'] = item._count;
    }

    const typeMap: Record<string, number> = {};
    for (const item of byType) {
      typeMap[item.type] = Number(item.count);
    }

    return {
      total,
      byLevel: levelMap,
      byType: typeMap,
    };
  }

  // ==========================================
  // 辅助方法
  // ==========================================

  /**
   * 解析规则条件
   */
  parseCondition(condition: unknown): AlertRuleCondition {
    return condition as AlertRuleCondition;
  }

  /**
   * 解析规则动作
   */
  parseActions(actions: unknown): AlertRuleAction[] {
    return actions as AlertRuleAction[];
  }
}
