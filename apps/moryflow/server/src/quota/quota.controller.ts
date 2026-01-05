/**
 * Quota Controller
 * 用量统计 API
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthGuard, CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { QuotaService } from './quota.service';
import type { UsageResponseDto } from './dto';

@ApiTags('Quota')
@ApiBearerAuth('bearer')
@ApiCookieAuth('better-auth.session_token')
@UseGuards(AuthGuard)
@Controller('api/usage')
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  /**
   * 获取用户用量和额度
   * GET /api/usage
   */
  @Get()
  @ApiOperation({ summary: '获取用户用量和额度' })
  @ApiOkResponse({ description: '用量和额度信息' })
  async getUsage(
    @CurrentUser() user: CurrentUserDto,
  ): Promise<UsageResponseDto> {
    return this.quotaService.getUsage(user.id, user.tier);
  }
}
