/**
 * Admin Subscriptions Controller
 *
 * [INPUT]: Subscription management requests
 * [OUTPUT]: Subscription data
 * [POS]: Admin API for subscription management
 */

import {
  Controller,
  Get,
  Patch,
  Query,
  Param,
  Body,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';
import { SubscriptionQueryDto, UpdateSubscriptionDto } from './dto';

@ApiTags('Admin')
@ApiCookieAuth()
@Controller({ path: 'admin/subscriptions', version: VERSION_NEUTRAL })
@RequireAdmin()
export class AdminSubscriptionsController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get subscriptions list
   */
  @Get()
  @ApiOperation({ summary: 'Get subscriptions list' })
  @ApiOkResponse({ description: 'List of subscriptions' })
  async getSubscriptions(@Query() query: SubscriptionQueryDto) {
    return this.adminService.getSubscriptions(query);
  }

  /**
   * Get single subscription
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiOkResponse({ description: 'Subscription details' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async getSubscription(@Param('id') id: string) {
    return this.adminService.getSubscription(id);
  }

  /**
   * Update subscription
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiOkResponse({ description: 'Subscription updated' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async updateSubscription(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.adminService.updateSubscription(id, dto);
  }
}
