/**
 * Admin Payment Service
 * 管理订阅、订单
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import type {
  CancelSubscriptionDto,
  SubscriptionQueryDto,
  OrderQueryDto,
  TestCheckoutDto,
} from './dto';
import type {
  SubscriptionStatus,
  PaymentStatus,
  ProductType,
} from '../../generated/prisma/enums';

@Injectable()
export class AdminPaymentService {
  private readonly logger = new Logger(AdminPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== 订阅管理 ====================

  /**
   * 获取所有订阅
   */
  async getSubscriptions(options: SubscriptionQueryDto) {
    const { limit, offset, status } = options;

    const subscriptions = await this.prisma.subscription.findMany({
      where: status ? { status: status as SubscriptionStatus } : undefined,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
      },
    });

    return {
      subscriptions,
      pagination: { limit, offset, count: subscriptions.length },
    };
  }

  /**
   * 获取单个订阅
   */
  async getSubscriptionById(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return { subscription };
  }

  /**
   * 取消订阅
   * 注意：需要调用 Creem SDK 来实际取消
   */
  async cancelSubscription(id: string, dto: CancelSubscriptionDto) {
    // dto 参数保留用于将来 Creem SDK 集成
    void dto;
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // TODO: 等待 Creem SDK 集成后实现
    // 目前仅更新本地状态会导致用户继续被扣款，因此暂时禁用
    throw new NotImplementedException(
      'Subscription cancellation requires Creem SDK integration. ' +
        'Please cancel directly through the Creem dashboard for now.',
    );

    // 以下代码在 Creem SDK 集成后启用：
    // const creem = new Creem({ ... });
    // if (dto.cancelAtPeriodEnd) {
    //   await creem.updateSubscription({ subscriptionId: subscription.creemSubscriptionId, cancelAtPeriodEnd: true });
    // } else {
    //   await creem.cancelSubscription({ subscriptionId: subscription.creemSubscriptionId });
    // }
    //
    // await this.prisma.subscription.update({
    //   where: { id },
    //   data: { status: dto.cancelAtPeriodEnd ? 'scheduled_cancel' : 'canceled', cancelAtPeriodEnd: dto.cancelAtPeriodEnd },
    // });
    //
    // this.logger.log(`Subscription ${id} ${dto.cancelAtPeriodEnd ? 'scheduled for cancellation' : 'canceled'}`);
    // return { success: true, status: dto.cancelAtPeriodEnd ? 'scheduled_cancel' : 'canceled' };
  }

  // ==================== 订单管理 ====================

  /**
   * 获取所有订单
   */
  async getOrders(options: OrderQueryDto) {
    const { limit, offset, status, productType } = options;

    const orders = await this.prisma.paymentOrder.findMany({
      where: {
        ...(status ? { status: status as PaymentStatus } : {}),
        ...(productType ? { productType: productType as ProductType } : {}),
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
      },
    });

    return {
      orders,
      pagination: { limit, offset, count: orders.length },
    };
  }

  /**
   * 获取单个订单
   */
  async getOrderById(id: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { order };
  }

  // ==================== 测试支付 ====================

  /**
   * 创建测试 Checkout
   * 仅在 CREEM_TEST_MODE=true 时可用
   * 使用官方 SDK: https://docs.creem.io/code/sdks/typescript
   */
  async createTestCheckout(dto: TestCheckoutDto) {
    // 1. 检查是否为测试模式
    const testMode = this.configService.get('CREEM_TEST_MODE') === 'true';
    if (!testMode) {
      throw new ForbiddenException(
        'Test checkout only available in test mode (CREEM_TEST_MODE=true)',
      );
    }

    // 2. 获取产品 ID
    const productId = this.configService.get<string>(dto.productEnvKey);
    if (!productId) {
      throw new BadRequestException(
        `Invalid product key: ${dto.productEnvKey}. Please check environment variables.`,
      );
    }

    // 3. 获取 API Key
    const apiKey = this.configService.get<string>('CREEM_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('CREEM_API_KEY not configured');
    }

    // 4. 调用 Creem SDK 创建 checkout（使用官方 creem_io SDK）
    const { createCreem } = await import('creem_io');
    const creem = createCreem({
      apiKey,
      testMode: true, // 测试模式
    });

    this.logger.log(
      `Creating test checkout for product ${dto.productEnvKey} (${productId}) user ${dto.testUserId}`,
    );

    const checkout = await creem.checkouts.create({
      productId,
      successUrl: dto.successUrl,
      metadata: {
        referenceId: dto.testUserId.trim(),
      },
    });

    this.logger.log(`Test checkout created: ${checkout.checkoutUrl}`);

    return { checkoutUrl: checkout.checkoutUrl };
  }
}
