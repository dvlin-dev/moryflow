/**
 * Webhook Delivery Processor
 *
 * [INPUT]: DigestWebhookDeliveryJobData
 * [OUTPUT]: HTTP POST 到用户 Webhook 端点
 * [POS]: BullMQ Worker - Digest Webhook 投递执行逻辑
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UrlValidator } from '../../common/validators/url.validator';
import {
  DIGEST_WEBHOOK_DELIVERY_QUEUE,
  type DigestWebhookDeliveryJobData,
} from '../../queue/queue.constants';
import { NOTIFICATION } from '../digest.constants';

/** Webhook 投递结果 */
interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  latencyMs: number;
  error?: string;
}

@Processor(DIGEST_WEBHOOK_DELIVERY_QUEUE)
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly urlValidator: UrlValidator,
  ) {
    super();
  }

  async process(
    job: Job<DigestWebhookDeliveryJobData>,
  ): Promise<DeliveryResult> {
    const { runId, webhookUrl, event, payload } = job.data;
    const startTime = Date.now();

    this.logger.log(
      `Processing webhook delivery: ${job.id} for run ${runId}, attempt ${job.attemptsMade + 1}`,
    );

    // 1. URL 安全校验（SSRF 防护）
    if (!(await this.urlValidator.isAllowed(webhookUrl))) {
      const error = `Webhook URL not allowed: ${webhookUrl}`;
      this.logger.warn(error);
      await this.recordDelivery(job.data, {
        success: false,
        latencyMs: Date.now() - startTime,
        error,
      });
      // 不重试，直接失败（job.discard() 已被弃用，用 UnrecoverableError）
      throw new UnrecoverableError(error);
    }

    try {
      // 2. 获取订阅的 webhook secret（用于签名）
      const subscription = await this.prisma.digestSubscription.findUnique({
        where: { id: job.data.subscriptionId },
        select: { webhookSecret: true },
      });

      // 3. 生成签名
      const timestamp = new Date().toISOString();
      const bodyString = JSON.stringify(payload);
      const signature = this.generateSignature(
        bodyString,
        timestamp,
        subscription?.webhookSecret,
      );

      // 4. 发送 HTTP POST
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [NOTIFICATION.signatureHeader]: signature,
          [NOTIFICATION.eventHeader]: event,
          [NOTIFICATION.timestampHeader]: timestamp,
        },
        body: bodyString,
        redirect: 'manual',
        signal: AbortSignal.timeout(NOTIFICATION.webhookTimeoutMs),
      });

      const latencyMs = Date.now() - startTime;
      const success = response.ok;

      // 5. 记录投递结果（无论成功失败都记录）
      const result: DeliveryResult = {
        success,
        statusCode: response.status,
        latencyMs,
        error: success ? undefined : `HTTP ${response.status}`,
      };
      await this.recordDelivery(job.data, result);

      if (!success) {
        this.logger.warn(
          `Webhook delivery failed: ${webhookUrl} returned ${response.status}`,
        );
        // 抛出错误触发重试（已记录，不会再记录）
        throw new Error(`HTTP ${response.status}`);
      }

      this.logger.log(
        `Webhook delivered successfully: ${event} -> ${webhookUrl} (${latencyMs}ms)`,
      );

      return result;
    } catch (error) {
      // 仅记录网络层错误（超时、DNS 失败等），HTTP 错误已在上面记录
      const isHttpError =
        error instanceof Error && error.message.startsWith('HTTP ');
      if (!isHttpError) {
        const latencyMs = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        await this.recordDelivery(job.data, {
          success: false,
          latencyMs,
          error: errorMessage,
        });
      }

      this.logger.error(`Webhook delivery error: ${webhookUrl}`, error);
      throw error;
    }
  }

  /**
   * 生成 HMAC-SHA256 签名
   * 格式：sha256=<hex> 或 none（无 secret 时）
   */
  private generateSignature(
    body: string,
    timestamp: string,
    secret?: string | null,
  ): string {
    // 如果没有配置 secret，返回 none 明确表示未签名
    if (!secret) {
      return 'none';
    }

    const signaturePayload = `${timestamp}.${body}`;
    const signature = createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    return `sha256=${signature}`;
  }

  /**
   * 记录投递结果到数据库
   */
  private async recordDelivery(
    jobData: DigestWebhookDeliveryJobData,
    result: DeliveryResult,
  ): Promise<void> {
    try {
      // 更新 DigestRun 的通知状态
      await this.prisma.digestRun.update({
        where: { id: jobData.runId },
        data: {
          webhookDeliveredAt: result.success ? new Date() : undefined,
          webhookError: result.error,
          webhookStatusCode: result.statusCode,
          webhookLatencyMs: result.latencyMs,
        },
      });
    } catch (error) {
      // 记录失败不影响主流程
      this.logger.warn('Failed to record webhook delivery result:', error);
    }
  }
}
