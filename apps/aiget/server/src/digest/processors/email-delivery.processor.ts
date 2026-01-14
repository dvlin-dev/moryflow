/**
 * Email Delivery Processor
 *
 * [INPUT]: DigestEmailDeliveryJobData
 * [OUTPUT]: 发送 Email 到用户邮箱
 * [POS]: BullMQ Worker - Digest Email 投递执行逻辑
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import {
  DIGEST_EMAIL_DELIVERY_QUEUE,
  type DigestEmailDeliveryJobData,
} from '../../queue/queue.constants';
import { generateDigestEmailHtml } from '../templates/digest-email.template';

/** Email 投递结果 */
interface DeliveryResult {
  success: boolean;
  error?: string;
}

@Processor(DIGEST_EMAIL_DELIVERY_QUEUE)
export class EmailDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailDeliveryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<DigestEmailDeliveryJobData>): Promise<DeliveryResult> {
    const {
      runId,
      emailTo,
      emailSubject,
      subscriptionName,
      itemsCount,
      narrativeMarkdown,
      items,
      viewUrl,
    } = job.data;

    this.logger.log(
      `Processing email delivery: ${job.id} for run ${runId}, attempt ${job.attemptsMade + 1}`,
    );

    try {
      // 1. 生成邮件 HTML
      const html = generateDigestEmailHtml({
        subscriptionName,
        itemsCount,
        items,
        narrativeMarkdown,
        viewUrl,
        // TODO: 生成退订链接
        unsubscribeUrl: undefined,
      });

      // 2. 发送邮件
      await this.emailService.sendEmail(emailTo, emailSubject, html);

      // 3. 记录成功
      await this.recordDelivery(runId, { success: true });

      this.logger.log(
        `Email delivered successfully to ${emailTo} for run ${runId}`,
      );

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 记录失败
      await this.recordDelivery(runId, {
        success: false,
        error: errorMessage,
      });

      this.logger.error(`Email delivery failed for run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * 记录投递结果到数据库
   */
  private async recordDelivery(
    runId: string,
    result: DeliveryResult,
  ): Promise<void> {
    try {
      await this.prisma.digestRun.update({
        where: { id: runId },
        data: {
          emailDeliveredAt: result.success ? new Date() : undefined,
          emailError: result.error,
        },
      });
    } catch (error) {
      // 记录失败不影响主流程
      this.logger.warn('Failed to record email delivery result:', error);
    }
  }
}
