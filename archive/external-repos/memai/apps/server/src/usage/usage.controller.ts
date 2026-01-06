/**
 * Usage Controller
 *
 * [INPUT]: Usage query requests
 * [OUTPUT]: Usage statistics
 * [POS]: Public API for usage data
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiOkResponse } from '@nestjs/swagger';
import { UsageService, UsageSummary } from './usage.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators';
import type { User } from '../../generated/prisma/client';

@ApiTags('Usage')
@ApiSecurity('apiKey')
@Controller({ path: 'usage', version: '1' })
@UseGuards(AuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  /**
   * Get current month usage
   */
  @Get('current')
  @ApiOperation({ summary: 'Get current month usage' })
  @ApiOkResponse({ description: 'Current month usage' })
  async getCurrentUsage(@CurrentUser() user: User): Promise<UsageSummary> {
    return this.usageService.getMonthlyUsage(user.id);
  }

  /**
   * Get usage history
   */
  @Get('history')
  @ApiOperation({ summary: 'Get usage history' })
  @ApiOkResponse({ description: 'Usage history' })
  async getUsageHistory(
    @CurrentUser() user: User,
  ): Promise<Array<{ billingPeriod: string } & UsageSummary>> {
    return this.usageService.getUsageHistory(user.id);
  }
}
