/**
 * [INPUT]: HTTP 请求
 * [OUTPUT]: 订阅管理响应
 * [POS]: 订阅管理 API 控制器（/api/admin/subscriptions/*）
 */

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '@aiget/auth-server';
import { AdminGuard } from '../common/guards/admin.guard';
import { SubscriptionsService } from './subscriptions.service';
import { ListSubscriptionsQuerySchema } from './dto';

@Controller('admin/subscriptions')
@UseGuards(JwtGuard, AdminGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  async listSubscriptions(@Query() query: Record<string, unknown>) {
    const parsed = ListSubscriptionsQuerySchema.parse(query);
    return this.subscriptionsService.listSubscriptions(parsed);
  }

  @Get(':id')
  async getSubscriptionById(@Param('id') id: string) {
    return this.subscriptionsService.getSubscriptionById(id);
  }
}
