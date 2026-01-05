// apps/server/src/common/services/webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export interface WebhookPayload {
  event: string;
  data: unknown;
  timestamp?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;

  constructor(private config: ConfigService) {
    this.webhookSecret = config.get('WEBHOOK_SECRET') || '';
  }

  /**
   * 发送 Webhook 请求
   */
  async send(url: string, payload: WebhookPayload): Promise<boolean> {
    const body = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    const signature = this.generateSignature(JSON.stringify(body));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000), // 10 秒超时
      });

      if (!response.ok) {
        this.logger.warn(`Webhook failed: ${url} returned ${response.status}`);
        return false;
      }

      this.logger.log(`Webhook sent: ${payload.event} -> ${url}`);
      return true;
    } catch (error) {
      this.logger.error(`Webhook error: ${url}`, error);
      return false;
    }
  }

  /**
   * 生成 HMAC 签名
   */
  private generateSignature(payload: string): string {
    if (!this.webhookSecret) return '';

    return createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * 验证 Webhook 签名（用于接收方）
   * 使用 timingSafeEqual 防止时序攻击
   */
  verifySignature(payload: string, signature: string): boolean {
    const expected = this.generateSignature(payload);
    if (!expected || !signature) return false;

    // 确保两个 Buffer 长度相同（timingSafeEqual 要求）
    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }
}
