/**
 * Digest Notification Service
 *
 * [INPUT]: DigestRun 完成事件、订阅配置
 * [OUTPUT]: 入队 Webhook/Email 投递任务
 * [POS]: 通知调度核心，检查配置并分发到对应投递队列（jobId 去重）
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DIGEST_WEBHOOK_DELIVERY_QUEUE,
  DIGEST_EMAIL_DELIVERY_QUEUE,
  type DigestWebhookDeliveryJobData,
  type DigestEmailDeliveryJobData,
} from '../../queue/queue.constants';
import { NOTIFICATION } from '../digest.constants';

/** 运行完成事件数据 */
export interface RunCompletedEvent {
  runId: string;
  subscriptionId: string;
  userId: string;
  status: 'completed' | 'failed';
  itemsDelivered: number;
  narrativeMarkdown?: string;
  items: Array<{
    title: string;
    url: string;
    aiSummary?: string;
    scoreOverall: number;
  }>;
  error?: string;
}

/** 通知结果 */
export interface NotificationResult {
  webhookEnqueued: boolean;
  emailEnqueued: boolean;
  webhookJobId?: string;
  emailJobId?: string;
}

@Injectable()
export class DigestNotificationService {
  private readonly logger = new Logger(DigestNotificationService.name);
  private readonly wwwUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(DIGEST_WEBHOOK_DELIVERY_QUEUE)
    private readonly webhookQueue: Queue<DigestWebhookDeliveryJobData>,
    @InjectQueue(DIGEST_EMAIL_DELIVERY_QUEUE)
    private readonly emailQueue: Queue<DigestEmailDeliveryJobData>,
  ) {
    // WWW URL 用于邮件中的查看/管理链接
    this.wwwUrl =
      this.config.get<string>('ANYHUNT_WWW_URL') || 'https://anyhunt.app';
  }

  /**
   * 处理运行完成事件
   * 检查订阅配置，入队通知任务
   */
  async onRunCompleted(event: RunCompletedEvent): Promise<NotificationResult> {
    const result: NotificationResult = {
      webhookEnqueued: false,
      emailEnqueued: false,
    };

    // 获取订阅配置
    const subscription = await this.prisma.digestSubscription.findUnique({
      where: { id: event.subscriptionId },
      select: {
        id: true,
        name: true,
        webhookEnabled: true,
        webhookUrl: true,
        emailEnabled: true,
        emailTo: true,
        emailSubjectTemplate: true,
      },
    });

    if (!subscription) {
      this.logger.warn(
        `Subscription ${event.subscriptionId} not found for notification`,
      );
      return result;
    }

    // 并行入队 Webhook 和 Email
    const [webhookResult, emailResult] = await Promise.allSettled([
      this.enqueueWebhook(event, subscription),
      this.enqueueEmail(event, subscription),
    ]);

    if (webhookResult.status === 'fulfilled' && webhookResult.value) {
      result.webhookEnqueued = true;
      result.webhookJobId = webhookResult.value;
    } else if (webhookResult.status === 'rejected') {
      this.logger.error('Failed to enqueue webhook:', webhookResult.reason);
    }

    if (emailResult.status === 'fulfilled' && emailResult.value) {
      result.emailEnqueued = true;
      result.emailJobId = emailResult.value;
    } else if (emailResult.status === 'rejected') {
      this.logger.error('Failed to enqueue email:', emailResult.reason);
    }

    this.logger.log(
      `Notification dispatched for run ${event.runId}: webhook=${result.webhookEnqueued}, email=${result.emailEnqueued}`,
    );

    return result;
  }

  /**
   * 入队 Webhook 投递任务
   */
  private async enqueueWebhook(
    event: RunCompletedEvent,
    subscription: {
      id: string;
      name: string;
      webhookEnabled: boolean;
      webhookUrl: string | null;
    },
  ): Promise<string | null> {
    if (!subscription.webhookEnabled || !subscription.webhookUrl) {
      return null;
    }

    const webhookEvent =
      event.status === 'completed'
        ? 'digest.run.completed'
        : 'digest.run.failed';

    const jobData: DigestWebhookDeliveryJobData = {
      runId: event.runId,
      subscriptionId: event.subscriptionId,
      userId: event.userId,
      webhookUrl: subscription.webhookUrl,
      event: webhookEvent,
      payload: {
        runId: event.runId,
        subscriptionId: event.subscriptionId,
        subscriptionName: subscription.name,
        status: event.status,
        itemsDelivered: event.itemsDelivered,
        narrativeMarkdown: event.narrativeMarkdown,
        items: event.items,
        timestamp: new Date().toISOString(),
      },
    };

    const job = await this.webhookQueue.add('deliver', jobData, {
      jobId: `digest-webhook-${event.runId}`,
      attempts: NOTIFICATION.webhookMaxRetries,
      backoff: {
        type: 'exponential',
        delay: NOTIFICATION.webhookRetryDelayMs,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    });

    this.logger.debug(`Webhook job enqueued: ${job.id} for run ${event.runId}`);
    return job.id ?? null;
  }

  /**
   * 入队 Email 投递任务
   */
  private async enqueueEmail(
    event: RunCompletedEvent,
    subscription: {
      id: string;
      name: string;
      emailEnabled: boolean;
      emailTo: string | null;
      emailSubjectTemplate: string | null;
    },
  ): Promise<string | null> {
    // 只有成功的运行才发送 Email
    if (
      event.status !== 'completed' ||
      !subscription.emailEnabled ||
      !subscription.emailTo
    ) {
      return null;
    }

    // 生成邮件主题
    const emailSubject = this.generateEmailSubject(
      subscription.emailSubjectTemplate,
      subscription.name,
      event.itemsDelivered,
    );

    // 构建查看链接
    const viewUrl = `${this.wwwUrl}/inbox?subscriptionId=${event.subscriptionId}&state=UNREAD`;
    const unsubscribeUrl = `${this.wwwUrl}/subscriptions/${event.subscriptionId}`;

    const jobData: DigestEmailDeliveryJobData = {
      runId: event.runId,
      subscriptionId: event.subscriptionId,
      userId: event.userId,
      emailTo: subscription.emailTo,
      emailSubject,
      subscriptionName: subscription.name,
      itemsCount: event.itemsDelivered,
      narrativeMarkdown: event.narrativeMarkdown,
      items: event.items.map((item) => ({
        title: item.title,
        url: item.url,
        aiSummary: item.aiSummary,
      })),
      viewUrl,
      unsubscribeUrl,
    };

    const job = await this.emailQueue.add('deliver', jobData, {
      jobId: `digest-email-${event.runId}`,
      attempts: NOTIFICATION.emailMaxRetries,
      backoff: {
        type: 'exponential',
        delay: NOTIFICATION.emailRetryDelayMs,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    });

    this.logger.debug(`Email job enqueued: ${job.id} for run ${event.runId}`);
    return job.id ?? null;
  }

  /**
   * 生成邮件主题
   */
  private generateEmailSubject(
    template: string | null,
    subscriptionName: string,
    itemsCount: number,
  ): string {
    if (template) {
      return template
        .replace('{{name}}', subscriptionName)
        .replace('{{count}}', String(itemsCount))
        .replace('{{date}}', new Date().toLocaleDateString('en-US'));
    }

    return `Your Digest: ${subscriptionName} - ${itemsCount} new items`;
  }
}
