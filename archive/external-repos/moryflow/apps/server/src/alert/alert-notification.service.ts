/**
 * Alert Notification Service
 * 告警通知服务
 *
 * [PROVIDES]: 发送告警通知（邮件）
 * [DEPENDS]: EmailService, ConfigService
 * [POS]: 复用现有邮件服务发送告警
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { AlertLevel, AlertRuleType } from '../../generated/prisma/client';
import type { AlertRuleAction, AlertContext } from './dto';

// 默认告警接收邮箱
const DEFAULT_ALERT_EMAIL = 'zhangbaolin.work@foxmail.com';

@Injectable()
export class AlertNotificationService {
  private readonly logger = new Logger(AlertNotificationService.name);
  private readonly defaultEmail: string;

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.defaultEmail =
      this.configService.get<string>('ALERT_DEFAULT_EMAIL') ??
      DEFAULT_ALERT_EMAIL;
  }

  /**
   * 发送告警通知
   */
  async sendAlert(
    rule: {
      id: string;
      name: string;
      type: AlertRuleType;
      level: AlertLevel;
    },
    context: AlertContext,
    actions: AlertRuleAction[],
  ): Promise<void> {
    // 获取邮件接收人
    const emailTargets = actions
      .filter((a) => a.channel === 'email')
      .map((a) => a.target);

    // 如果没有配置接收人，使用默认邮箱
    if (emailTargets.length === 0) {
      emailTargets.push(this.defaultEmail);
    }

    // 生成邮件内容
    const subject = this.buildSubject(rule, context);
    const html = this.buildEmailContent(rule, context);

    // 发送邮件
    for (const email of emailTargets) {
      try {
        await this.emailService.sendEmail(email, subject, html);
        this.logger.log(`Alert notification sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send alert to ${email}`, error);
      }
    }
  }

  /**
   * 构建邮件主题
   */
  private buildSubject(
    rule: { name: string; level: AlertLevel },
    context: AlertContext,
  ): string {
    const levelEmoji = rule.level === AlertLevel.critical ? '🚨' : '⚠️';
    const levelText =
      rule.level === AlertLevel.critical ? 'CRITICAL' : 'WARNING';

    return `${levelEmoji} [${levelText}] ${rule.name}`;
  }

  /**
   * 构建邮件内容
   */
  private buildEmailContent(
    rule: {
      id: string;
      name: string;
      type: AlertRuleType;
      level: AlertLevel;
    },
    context: AlertContext,
  ): string {
    const levelColor =
      rule.level === AlertLevel.critical ? '#dc2626' : '#f59e0b';
    const levelText =
      rule.level === AlertLevel.critical ? 'Critical' : 'Warning';
    const typeLabel = this.getTypeLabel(rule.type);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: ${levelColor}; padding: 20px; color: white;">
      <h1 style="margin: 0; font-size: 20px;">${levelText} Alert: ${rule.name}</h1>
    </div>

    <!-- Content -->
    <div style="padding: 24px;">
      <!-- Alert Message -->
      <div style="background-color: #fef2f2; border-left: 4px solid ${levelColor}; padding: 16px; margin-bottom: 20px; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 16px;">${context.message}</p>
      </div>

      <!-- Details -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 120px;">Alert Type</td>
          <td style="padding: 8px 0; font-weight: 500;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Severity</td>
          <td style="padding: 8px 0;">
            <span style="background-color: ${levelColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
              ${levelText}
            </span>
          </td>
        </tr>
        ${
          context.toolName
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Tool Name</td>
          <td style="padding: 8px 0; font-family: monospace;">${context.toolName}</td>
        </tr>
        `
            : ''
        }
        ${
          context.agentName
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Agent Name</td>
          <td style="padding: 8px 0; font-family: monospace;">${context.agentName}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Current Value</td>
          <td style="padding: 8px 0; font-weight: 500; color: ${levelColor};">${context.value}${rule.type.includes('rate') ? '%' : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Threshold</td>
          <td style="padding: 8px 0;">${context.threshold}${rule.type.includes('rate') ? '%' : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Time</td>
          <td style="padding: 8px 0;">${new Date().toISOString()}</td>
        </tr>
      </table>

      <!-- Actions -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">Recommended Actions:</p>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${this.getRecommendedActions(rule.type, context)}
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This is an automated alert from Moryflow Agent Monitoring System.
        <br>
        Rule ID: ${rule.id}
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 获取规则类型标签
   */
  private getTypeLabel(type: AlertRuleType): string {
    const labels: Record<AlertRuleType, string> = {
      tool_failure_rate: 'Tool Failure Rate',
      agent_consecutive: 'Agent Consecutive Failures',
      system_failure_rate: 'System Failure Rate',
    };
    return labels[type] ?? type;
  }

  /**
   * 获取推荐操作
   */
  private getRecommendedActions(
    type: AlertRuleType,
    context: AlertContext,
  ): string {
    const actions: string[] = [];

    switch (type) {
      case AlertRuleType.tool_failure_rate:
        actions.push(
          `<li>Check the "${context.toolName}" tool implementation for bugs</li>`,
          '<li>Review error logs for detailed failure reasons</li>',
          '<li>Verify external service dependencies</li>',
        );
        break;

      case AlertRuleType.agent_consecutive:
        actions.push(
          `<li>Review the "${context.agentName}" agent configuration</li>`,
          '<li>Check agent prompt and tool definitions</li>',
          '<li>Verify model availability and rate limits</li>',
        );
        break;

      case AlertRuleType.system_failure_rate:
        actions.push(
          '<li>Check system health and resource usage</li>',
          '<li>Review recent deployments or configuration changes</li>',
          '<li>Monitor API rate limits and quotas</li>',
        );
        break;
    }

    return actions.join('\n');
  }
}
