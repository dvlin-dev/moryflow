/**
 * [INPUT]: API 请求 (Authorization: Token apiKey 认证)
 * [OUTPUT]: QuotaStatusDto
 * [POS]: 配额模块 API 路由，提供公开 API 端点
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { QuotaService } from './quota.service';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { QuotaStatusDto } from './dto';

@Public()
@Controller({ path: 'quota', version: '1' })
@UseGuards(ApiKeyGuard)
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  /**
   * 查询当前配额状态
   * GET /api/v1/quota
   *
   * 需要 apiKey 认证（Authorization: Token <apiKey>）
   */
  @Get()
  @ApiOkResponse({ description: 'Quota status', type: QuotaStatusDto })
  async getQuotaStatus(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
  ): Promise<QuotaStatusDto> {
    const status = await this.quotaService.getStatus(apiKey.userId);

    return {
      daily: {
        limit: status.daily.limit,
        used: status.daily.used,
        remaining: status.daily.remaining,
        resetsAt: status.daily.resetsAt.toISOString(),
      },
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
