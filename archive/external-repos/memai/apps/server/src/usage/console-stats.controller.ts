/**
 * Console Stats Controller
 *
 * [INPUT]: Stats query requests
 * [OUTPUT]: Dashboard statistics
 * [POS]: Console API for usage statistics
 */

import { Controller, Get, Query, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { UsageService } from './usage.service';
import { parsePositiveInt } from '../common/utils';

/** Max allowed values for stats queries */
const MAX_DAYS = 90;
const MAX_MONTHS = 24;

@ApiTags('Console')
@ApiCookieAuth()
@Controller({ path: 'console/stats', version: VERSION_NEUTRAL })
export class ConsoleStatsController {
  constructor(private readonly usageService: UsageService) {}

  /**
   * Get user statistics overview
   */
  @Get('overview')
  @ApiOperation({ summary: 'Get statistics overview' })
  @ApiOkResponse({ description: 'Statistics overview' })
  async getOverview(@CurrentUser() user: CurrentUserDto) {
    return this.usageService.getUserStats(user.id);
  }

  /**
   * Get daily usage for charts
   */
  @Get('daily')
  @ApiOperation({ summary: 'Get daily usage data' })
  @ApiOkResponse({ description: 'Daily usage data' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30, max: 90)' })
  async getDailyUsage(
    @CurrentUser() user: CurrentUserDto,
    @Query('days') days?: string,
  ) {
    const numDays = parsePositiveInt(days, 30, MAX_DAYS);
    return this.usageService.getDailyUsage(user.id, numDays);
  }

  /**
   * Get usage history (monthly)
   */
  @Get('history')
  @ApiOperation({ summary: 'Get monthly usage history' })
  @ApiOkResponse({ description: 'Monthly usage history' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of months (default: 12, max: 24)' })
  async getHistory(
    @CurrentUser() user: CurrentUserDto,
    @Query('limit') limit?: string,
  ) {
    const numLimit = parsePositiveInt(limit, 12, MAX_MONTHS);
    return this.usageService.getUsageHistory(user.id, numLimit);
  }
}
