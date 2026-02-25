/**
 * Admin Payment Controller
 * 订阅、订单管理 API
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AdminGuard } from '../common/guards';
import { AdminPaymentService } from './admin-payment.service';
import {
  CancelSubscriptionSchema,
  SubscriptionQuerySchema,
  OrderQuerySchema,
  TestCheckoutSchema,
} from './dto';

@ApiTags('Admin - Payment')
@ApiBearerAuth('bearer')
@Controller({ path: 'admin/payment', version: '1' })
@UseGuards(AdminGuard)
export class AdminPaymentController {
  constructor(private readonly adminPaymentService: AdminPaymentService) {}

  // ==================== 订阅管理 ====================

  @ApiOperation({ summary: '获取订阅列表' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'canceled', 'paused', 'past_due', 'trialing', 'unpaid'],
  })
  @ApiResponse({ status: 200, description: '订阅列表' })
  @Get('subscriptions')
  getSubscriptions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ) {
    const parsed = SubscriptionQuerySchema.safeParse({ limit, offset, status });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminPaymentService.getSubscriptions(parsed.data);
  }

  @ApiOperation({ summary: '获取订阅详情' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: '订阅详情' })
  @Get('subscriptions/:id')
  getSubscriptionById(@Param('id') id: string) {
    return this.adminPaymentService.getSubscriptionById(id);
  }

  @ApiOperation({ summary: '取消订阅' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @Post('subscriptions/:id/cancel')
  cancelSubscription(@Param('id') id: string, @Body() body: unknown) {
    const parsed = CancelSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminPaymentService.cancelSubscription(id, parsed.data);
  }

  // ==================== 订单管理 ====================

  @ApiOperation({ summary: '获取订单列表' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'completed', 'failed', 'refunded', 'canceled'],
  })
  @ApiQuery({
    name: 'productType',
    required: false,
    enum: ['subscription', 'credits', 'license'],
  })
  @ApiResponse({ status: 200, description: '订单列表' })
  @Get('orders')
  getOrders(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('productType') productType?: string,
  ) {
    const parsed = OrderQuerySchema.safeParse({
      limit,
      offset,
      status,
      productType,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminPaymentService.getOrders(parsed.data);
  }

  @ApiOperation({ summary: '获取订单详情' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: '订单详情' })
  @Get('orders/:id')
  getOrderById(@Param('id') id: string) {
    return this.adminPaymentService.getOrderById(id);
  }

  // ==================== 测试支付 ====================

  @ApiOperation({
    summary: '创建测试 Checkout',
    description: '仅在 CREEM_TEST_MODE=true 时可用，用于测试支付流程',
  })
  @ApiResponse({ status: 200, description: '返回 checkout URL' })
  @ApiResponse({ status: 403, description: '非测试模式不可用' })
  @Post('test-checkout')
  createTestCheckout(@Body() body: unknown) {
    const parsed = TestCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminPaymentService.createTestCheckout(parsed.data);
  }
}
