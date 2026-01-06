/**
 * Alert Detector Service
 * 告警检测定时任务
 *
 * [PROVIDES]: 定时检测告警条件，触发告警
 * [DEPENDS]: PrismaService, AlertService, AlertNotificationService
 * [POS]: 每 5 分钟执行一次检测
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AlertService } from './alert.service';
import { AlertNotificationService } from './alert-notification.service';
import {
  AlertRuleType,
  AlertLevel,
  AgentSpanStatus,
  AgentTraceStatus,
} from '../../generated/prisma/client';
import type { AlertRuleCondition, AlertContext } from './dto';

@Injectable()
export class AlertDetectorService {
  private readonly logger = new Logger(AlertDetectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertService: AlertService,
    private readonly notificationService: AlertNotificationService,
  ) {}

  /**
   * 每 5 分钟执行检测
   */
  @Cron('*/5 * * * *')
  async handleDetection(): Promise<void> {
    this.logger.debug('Starting alert detection...');

    try {
      const rules = await this.alertService.getEnabledRules();

      for (const rule of rules) {
        await this.checkRule(rule);
      }

      this.logger.debug(`Checked ${rules.length} alert rules`);
    } catch (error) {
      this.logger.error('Alert detection failed', error);
    }
  }

  /**
   * 检查单个规则
   */
  private async checkRule(rule: {
    id: string;
    name: string;
    type: AlertRuleType;
    level: AlertLevel;
    condition: unknown;
    actions: unknown;
    cooldown: number;
  }): Promise<void> {
    // 检查冷却期
    if (await this.alertService.isInCooldown(rule.id, rule.cooldown)) {
      this.logger.debug(`Rule ${rule.name} is in cooldown, skipping`);
      return;
    }

    const condition = this.alertService.parseCondition(rule.condition);
    const actions = this.alertService.parseActions(rule.actions);

    let triggered = false;
    let context: AlertContext | null = null;

    switch (rule.type) {
      case AlertRuleType.tool_failure_rate:
        ({ triggered, context } = await this.checkToolFailureRate(condition));
        break;

      case AlertRuleType.agent_consecutive:
        ({ triggered, context } = await this.checkAgentConsecutive(condition));
        break;

      case AlertRuleType.system_failure_rate:
        ({ triggered, context } = await this.checkSystemFailureRate(condition));
        break;
    }

    if (triggered && context) {
      this.logger.warn(`Alert triggered: ${rule.name} - ${context.message}`);

      // 记录告警历史
      await this.alertService.createHistory(
        rule.id,
        rule.level,
        context as unknown as Record<string, unknown>,
      );

      // 发送通知
      await this.notificationService.sendAlert(rule, context, actions);
    }
  }

  /**
   * 检测 Tool 失败率
   * 条件：过去 1 小时内，某 Tool 失败率 > 阈值 且调用次数 > minCount
   */
  private async checkToolFailureRate(
    condition: AlertRuleCondition,
  ): Promise<{ triggered: boolean; context: AlertContext | null }> {
    const cutoffTime = new Date();
    cutoffTime.setSeconds(cutoffTime.getSeconds() - condition.timeWindow);

    // 按 Tool 名称聚合统计
    const stats = await this.prisma.$queryRaw<
      Array<{
        name: string;
        total: bigint;
        failed: bigint;
      }>
    >`
      SELECT
        name,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM "AgentSpan"
      WHERE type = 'function'
        AND "startedAt" >= ${cutoffTime}
      GROUP BY name
      HAVING COUNT(*) >= ${condition.minCount ?? 10}
    `;

    for (const tool of stats) {
      const total = Number(tool.total);
      const failed = Number(tool.failed);
      const failureRate = (failed / total) * 100;

      if (
        this.compareValue(failureRate, condition.operator, condition.threshold)
      ) {
        return {
          triggered: true,
          context: {
            toolName: tool.name,
            value: Math.round(failureRate * 10) / 10,
            threshold: condition.threshold,
            message: `Tool "${tool.name}" failure rate ${failureRate.toFixed(1)}% exceeds ${condition.threshold}% (${failed}/${total} calls)`,
          },
        };
      }
    }

    return { triggered: false, context: null };
  }

  /**
   * 检测 Agent 连续失败
   * 条件：同一 Agent 连续 N 次执行失败
   */
  private async checkAgentConsecutive(
    condition: AlertRuleCondition,
  ): Promise<{ triggered: boolean; context: AlertContext | null }> {
    const cutoffTime = new Date();
    cutoffTime.setSeconds(cutoffTime.getSeconds() - condition.timeWindow);

    // 获取所有 Agent 的最近执行记录
    const agentNames = await this.prisma.agentTrace.findMany({
      where: { startedAt: { gte: cutoffTime } },
      select: { agentName: true },
      distinct: ['agentName'],
    });

    for (const { agentName } of agentNames) {
      // 获取该 Agent 最近 N 次执行
      const recentTraces = await this.prisma.agentTrace.findMany({
        where: {
          agentName,
          startedAt: { gte: cutoffTime },
        },
        orderBy: { startedAt: 'desc' },
        take: Math.ceil(condition.threshold),
        select: { status: true },
      });

      // 检查是否全部失败
      if (recentTraces.length >= condition.threshold) {
        const consecutiveFailures = recentTraces.filter(
          (t) => t.status === AgentTraceStatus.failed,
        ).length;

        if (consecutiveFailures >= condition.threshold) {
          return {
            triggered: true,
            context: {
              agentName,
              value: consecutiveFailures,
              threshold: condition.threshold,
              message: `Agent "${agentName}" has ${consecutiveFailures} consecutive failures`,
            },
          };
        }
      }
    }

    return { triggered: false, context: null };
  }

  /**
   * 检测系统整体失败率
   * 条件：过去 1 小时内，整体失败率 > 阈值
   */
  private async checkSystemFailureRate(
    condition: AlertRuleCondition,
  ): Promise<{ triggered: boolean; context: AlertContext | null }> {
    const cutoffTime = new Date();
    cutoffTime.setSeconds(cutoffTime.getSeconds() - condition.timeWindow);

    const [total, failed] = await Promise.all([
      this.prisma.agentTrace.count({
        where: { startedAt: { gte: cutoffTime } },
      }),
      this.prisma.agentTrace.count({
        where: {
          startedAt: { gte: cutoffTime },
          status: AgentTraceStatus.failed,
        },
      }),
    ]);

    if (total < (condition.minCount ?? 10)) {
      return { triggered: false, context: null };
    }

    const failureRate = (failed / total) * 100;

    if (
      this.compareValue(failureRate, condition.operator, condition.threshold)
    ) {
      return {
        triggered: true,
        context: {
          value: Math.round(failureRate * 10) / 10,
          threshold: condition.threshold,
          message: `System failure rate ${failureRate.toFixed(1)}% exceeds ${condition.threshold}% (${failed}/${total} traces)`,
        },
      };
    }

    return { triggered: false, context: null };
  }

  /**
   * 比较值
   */
  private compareValue(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * 手动触发检测（供测试/Admin 使用）
   */
  async triggerDetection(): Promise<void> {
    await this.handleDetection();
  }
}
