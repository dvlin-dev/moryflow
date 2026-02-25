/**
 * Payment Controller（用户端）
 * 提供产品列表、Checkout 配置、订阅状态查询
 */

/**
 * [INPUT]: 当前用户 + 产品信息 + 支付配置
 * [OUTPUT]: Checkout 配置与支付链接
 * [POS]: 用户端支付入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard, CurrentUser, Public } from '../auth';
import type { CurrentUserDto } from '../types';
import { getAllowedOrigins } from '../common/utils';
import { PrismaService } from '../prisma';
import { getProductConfigs, type ProductConfig } from '../config';
import { resolveSuccessUrl } from './payment.utils';

/** 产品信息（API 返回格式） */
interface ProductInfo {
  id: string;
  name: string;
  type: string;
  priceUsd: number;
  credits?: number;
  billingCycle?: string;
  licenseTier?: string;
  activationLimit?: number;
}

/** 创建 Checkout 请求 */
interface CreateCheckoutDto {
  productId: string;
  successUrl?: string;
  cancelUrl?: string;
}

@ApiTags('Payment')
@Controller({ path: 'payment', version: '1' })
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /api/v1/payment/products
   * 获取产品列表（公开接口）
   */
  @ApiOperation({ summary: '获取产品列表' })
  @ApiResponse({ status: 200, description: '产品列表' })
  @Public()
  @Get('products')
  getProducts() {
    const configs = getProductConfigs();
    const products: ProductInfo[] = [];

    configs.forEach((config: ProductConfig, productId: string) => {
      products.push({
        id: productId,
        name: config.name,
        type: config.type,
        priceUsd: config.priceUsd,
        credits: config.credits,
        billingCycle: config.billingCycle,
        licenseTier: config.licenseTier,
        activationLimit: config.activationLimit,
      });
    });

    return { products };
  }

  /**
   * GET /api/v1/payment/checkout-config/:productId
   * 获取 Checkout 配置（需要登录）
   * 前端应使用此配置调用 Better Auth Creem 插件的 createCheckout
   */
  @ApiOperation({ summary: '获取 Checkout 配置' })
  @ApiParam({ name: 'productId', description: 'Creem 产品 ID' })
  @ApiResponse({ status: 200, description: 'Checkout 配置' })
  @ApiResponse({ status: 404, description: '产品不存在' })
  @ApiBearerAuth('bearer')
  @UseGuards(AuthGuard)
  @Get('checkout-config/:productId')
  getCheckoutConfig(
    @Param('productId') productId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    // 验证产品是否存在
    const configs = getProductConfigs();
    const product = configs.get(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 返回 checkout 配置
    // 前端应使用此配置调用 Better Auth Creem 插件的 createCheckout
    return {
      productId,
      metadata: {
        referenceId: user.id, // 关键：关联用户 ID，webhook 回调时使用
      },
      successUrl: '/api/v1/payment/success',
      cancelUrl: '/payment/cancel',
    };
  }

  /**
   * GET /api/v1/payment/subscription
   * 获取当前用户的订阅状态（需要登录）
   */
  @ApiOperation({ summary: '获取用户订阅状态' })
  @ApiResponse({ status: 200, description: '订阅状态' })
  @ApiBearerAuth('bearer')
  @UseGuards(AuthGuard)
  @Get('subscription')
  async getSubscription(@CurrentUser() user: CurrentUserDto) {
    // 查询用户的活跃订阅
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'active',
      },
      select: {
        id: true,
        productId: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    });

    if (!subscription) {
      return {
        hasSubscription: false,
        subscription: null,
      };
    }

    return {
      hasSubscription: true,
      subscription,
    };
  }

  /**
   * POST /api/v1/payment/checkout
   * 创建 Checkout 支付链接（需要登录）
   */
  @ApiOperation({ summary: '创建 Checkout 支付链接' })
  @ApiBody({
    schema: { type: 'object', properties: { productId: { type: 'string' } } },
  })
  @ApiResponse({ status: 200, description: '返回支付链接' })
  @ApiResponse({ status: 400, description: '参数错误或 API 未配置' })
  @ApiResponse({ status: 404, description: '产品不存在' })
  @ApiBearerAuth('bearer')
  @UseGuards(AuthGuard)
  @Post('checkout')
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    // 1. 验证产品是否存在
    const configs = getProductConfigs();
    const product = configs.get(dto.productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2. 获取 Creem API Key
    const apiKey = this.configService.get<string>('CREEM_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('CREEM_API_KEY not configured');
    }

    // 3. 获取测试模式设置
    const testMode = this.configService.get('CREEM_TEST_MODE') === 'true';

    // 4. 构建成功 URL：指向服务器中转页面，由页面跳转到 Deep Link
    const baseUrl = this.configService.get<string>('BETTER_AUTH_URL');
    const paymentBaseUrl = baseUrl || 'https://server.moryflow.com';
    const allowedOrigins = getAllowedOrigins();
    let successUrl: string;

    try {
      successUrl = resolveSuccessUrl(
        dto.successUrl,
        paymentBaseUrl,
        allowedOrigins,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid successUrl',
      );
    }

    // 5. 调用 Creem SDK 创建 checkout
    try {
      const { createCreem } = await import('creem_io');
      const creem = createCreem({
        apiKey,
        testMode,
      });

      this.logger.log(
        `Creating checkout for product ${dto.productId} user ${user.id} (testMode: ${testMode})`,
      );

      const checkout = await creem.checkouts.create({
        productId: dto.productId,
        successUrl,
        metadata: {
          referenceId: user.id, // 关键：webhook 回调时用于关联用户
        },
      });

      this.logger.log(`Checkout created: ${checkout.checkoutUrl}`);

      return { checkoutUrl: checkout.checkoutUrl };
    } catch (error) {
      this.logger.error('Failed to create checkout:', error);
      throw new BadRequestException(
        `Failed to create checkout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
