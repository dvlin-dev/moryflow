/**
 * [DEFINES]: Webhook 模块自定义错误类
 * [USED_BY]: webhook.service.ts, webhook.controller.ts
 * [POS]: 错误边界，提供清晰的错误类型和错误码
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** Webhook 错误码 */
export enum WebhookErrorCode {
  WEBHOOK_NOT_FOUND = 'WEBHOOK_NOT_FOUND',
  WEBHOOK_LIMIT_EXCEEDED = 'WEBHOOK_LIMIT_EXCEEDED',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',
  WEBHOOK_URL_INVALID = 'WEBHOOK_URL_INVALID',
}

/** Webhook 错误基类 */
export abstract class WebhookError extends HttpException {
  constructor(
    public readonly code: WebhookErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          details,
        },
      },
      status,
    );
  }
}

/** Webhook 不存在错误 */
export class WebhookNotFoundError extends WebhookError {
  constructor(id: string) {
    super(
      WebhookErrorCode.WEBHOOK_NOT_FOUND,
      `Webhook not found: ${id}`,
      HttpStatus.NOT_FOUND,
      { id },
    );
  }
}

/** Webhook 数量超限错误 */
export class WebhookLimitExceededError extends WebhookError {
  constructor(limit: number) {
    super(
      WebhookErrorCode.WEBHOOK_LIMIT_EXCEEDED,
      `Maximum ${limit} webhooks allowed`,
      HttpStatus.BAD_REQUEST,
      { limit },
    );
  }
}

/** Webhook 投递失败错误 */
export class WebhookDeliveryFailedError extends WebhookError {
  constructor(webhookId: string, statusCode: number, reason?: string) {
    super(
      WebhookErrorCode.WEBHOOK_DELIVERY_FAILED,
      `Webhook delivery failed: ${reason || 'Unknown error'}`,
      HttpStatus.BAD_GATEWAY,
      { webhookId, statusCode, reason },
    );
  }
}

/** Webhook URL 无效错误 */
export class WebhookUrlInvalidError extends WebhookError {
  constructor(url: string, reason: string) {
    super(
      WebhookErrorCode.WEBHOOK_URL_INVALID,
      `Invalid webhook URL: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { url, reason },
    );
  }
}
