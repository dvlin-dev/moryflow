/**
 * [INPUT]: API 请求 (Authorization: Bearer apiKey 认证)
 * [OUTPUT]: QuotaStatusResponseDto
 * [POS]: 配额模块 API 路由，提供公开 API 端点
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';

@Controller({ path: 'quota', version: '1' })
@UseGuards(ApiKeyGuard)
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  /**
   * 查询当前配额状态
   * GET /api/v1/quota
   *
   * 需要 apiKey 认证（Authorization: Bearer <apiKey>）
   */
  @Get()
  async getQuotaStatus(@CurrentApiKey() apiKey: ApiKeyValidationResult) {
    const status = await this.quotaService.getStatus(apiKey.userId);

    return {
      monthly: {
        limit: status.monthly.limit,
        used: status.monthly.used,
        remaining: status.monthly.remaining,
      },
      purchased: status.purchased,
      totalRemaining: status.totalRemaining,
      periodEndsAt: status.periodEndsAt.toISOString(),
      periodStartsAt: status.periodStartsAt.toISOString(),
    };
  }
}
