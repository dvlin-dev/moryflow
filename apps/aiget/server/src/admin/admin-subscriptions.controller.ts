/**
 * Admin Subscriptions Controller
 * 订阅管理 API
 */

import { Controller, Get, Patch, Query, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminService } from './admin.service';
import {
  subscriptionQuerySchema,
  updateSubscriptionSchema,
  type SubscriptionQuery,
  type UpdateSubscriptionDto,
} from './dto';

@ApiTags('Admin - Subscriptions')
@ApiSecurity('session')
@Controller({ path: 'admin/subscriptions', version: '1' })
@RequireAdmin()
export class AdminSubscriptionsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get subscription list' })
  @ApiOkResponse({ description: 'Subscription list with pagination' })
  async getSubscriptions(
    @Query(new ZodValidationPipe(subscriptionQuerySchema))
    query: SubscriptionQuery,
  ) {
    return this.adminService.getSubscriptions(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiOkResponse({ description: 'Subscription details' })
  async getSubscription(@Param('id') id: string) {
    return this.adminService.getSubscription(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiOkResponse({ description: 'Updated subscription' })
  async updateSubscription(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSubscriptionSchema))
    dto: UpdateSubscriptionDto,
  ) {
    return this.adminService.updateSubscription(id, dto);
  }
}
