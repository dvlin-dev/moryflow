/**
 * [INPUT]: Webhook URL + payload
 * [OUTPUT]: boolean - send success/failure
 * [POS]: Shared webhook sender with SSRF guard and signature
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { UrlValidator } from '../validators/url.validator';
import { serverHttpRaw } from '../http/server-http-client';

export interface WebhookPayload {
  event: string;
  data: unknown;
  timestamp?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private config: ConfigService,
    private urlValidator: UrlValidator,
  ) {
    this.webhookSecret = config.get('WEBHOOK_SECRET') || '';
  }

  /**
   * 发送 Webhook 请求
   */
  async send(url: string, payload: WebhookPayload): Promise<boolean> {
    if (!(await this.urlValidator.isAllowed(url))) {
      this.logger.warn(`Webhook URL blocked by SSRF guard: ${url}`);
      return false;
    }

    const body = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    const bodyString = JSON.stringify(body);
    const signature = this.generateSignature(bodyString);

    try {
      const response = await serverHttpRaw({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
        },
        body: bodyString,
        redirect: 'manual',
        timeoutMs: 10000,
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
