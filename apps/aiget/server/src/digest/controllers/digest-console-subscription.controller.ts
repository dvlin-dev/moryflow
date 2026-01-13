/**
 * Digest Console Subscription Controller
 *
 * [INPUT]: 订阅管理请求（CRUD、启用/禁用、手动运行）
 * [OUTPUT]: DigestSubscription 响应
 * [POS]: Console 订阅管理 API（Session 认证）
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CurrentUser } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { CurrentUserDto } from '../../types';
import { DigestSubscriptionService } from '../services/subscription.service';
import { DigestRunService } from '../services/run.service';
import { DigestPreviewService } from '../services/preview.service';
import {
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  ListSubscriptionsQuerySchema,
  PreviewSubscriptionQuerySchema,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
  type ListSubscriptionsQuery,
  type PreviewSubscriptionQuery,
} from '../dto';
import {
  DIGEST_SUBSCRIPTION_RUN_QUEUE,
  type DigestSubscriptionRunJobData,
} from '../../queue/queue.constants';

@ApiTags('Console - Digest Subscriptions')
@ApiCookieAuth()
@Controller({ path: 'console/digest/subscriptions', version: '1' })
export class DigestConsoleSubscriptionController {
  constructor(
    private readonly subscriptionService: DigestSubscriptionService,
    private readonly runService: DigestRunService,
    private readonly previewService: DigestPreviewService,
    @InjectQueue(DIGEST_SUBSCRIPTION_RUN_QUEUE)
    private readonly runQueue: Queue<DigestSubscriptionRunJobData>,
  ) {}

  /**
   * 获取当前用户的订阅列表
   * GET /api/console/digest/subscriptions
   */
  @Get()
  @ApiOperation({ summary: 'List user subscriptions' })
  @ApiOkResponse({ description: 'Subscription list with pagination' })
  async findAll(
    @CurrentUser() user: CurrentUserDto,
    @Query(new ZodValidationPipe(ListSubscriptionsQuerySchema))
    query: ListSubscriptionsQuery,
  ) {
    const { items, nextCursor } = await this.subscriptionService.findMany(
      user.id,
      query,
    );

    return {
      items: items.map((s) => this.subscriptionService.toResponse(s)),
      nextCursor,
    };
  }

  /**
   * 获取单个订阅详情
   * GET /api/console/digest/subscriptions/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiOkResponse({ description: 'Subscription details' })
  async findOne(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    const subscription = await this.subscriptionService.findOne(user.id, id);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.subscriptionService.toResponse(subscription);
  }

  /**
   * 创建新订阅
   * POST /api/console/digest/subscriptions
   */
  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiCreatedResponse({ description: 'Subscription created' })
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(CreateSubscriptionSchema))
    input: CreateSubscriptionInput,
  ) {
    const subscription = await this.subscriptionService.create(user.id, input);
    return this.subscriptionService.toResponse(subscription);
  }

  /**
   * 更新订阅
   * PATCH /api/console/digest/subscriptions/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiOkResponse({ description: 'Subscription updated' })
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSubscriptionSchema))
    input: UpdateSubscriptionInput,
  ) {
    const subscription = await this.subscriptionService.update(
      user.id,
      id,
      input,
    );
    return this.subscriptionService.toResponse(subscription);
  }

  /**
   * 删除订阅
   * DELETE /api/console/digest/subscriptions/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiNoContentResponse({ description: 'Subscription deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.subscriptionService.delete(user.id, id);
  }

  /**
   * 启用/禁用订阅
   * POST /api/console/digest/subscriptions/:id/toggle
   */
  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle subscription enabled state' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiOkResponse({ description: 'Subscription toggled' })
  async toggleEnabled(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    // 获取当前状态
    const current = await this.subscriptionService.findOne(user.id, id);

    if (!current) {
      throw new NotFoundException('Subscription not found');
    }

    // 切换状态
    const subscription = await this.subscriptionService.toggleEnabled(
      user.id,
      id,
      !current.enabled,
    );
    return this.subscriptionService.toResponse(subscription);
  }

  /**
   * 手动触发运行
   * POST /api/console/digest/subscriptions/:id/run
   */
  @Post(':id/run')
  @ApiOperation({ summary: 'Trigger a manual run' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiCreatedResponse({ description: 'Run triggered' })
  async triggerRun(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    // 验证订阅存在且属于当前用户
    const subscription = await this.subscriptionService.findOne(user.id, id);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // 创建运行记录
    const outputLocale = subscription.outputLocale || 'en';
    const run = await this.runService.createRun(
      subscription.id,
      user.id,
      new Date(),
      'MANUAL',
      outputLocale,
    );

    // 创建运行任务
    await this.runQueue.add(
      'run',
      {
        subscriptionId: subscription.id,
        runId: run.id,
        userId: user.id,
        outputLocale,
        source: 'MANUAL',
      },
      {
        jobId: `sub-run-${run.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    return {
      runId: run.id,
      status: run.status,
      message: 'Run triggered successfully',
    };
  }

  /**
   * 预览订阅
   * POST /api/console/digest/subscriptions/:id/preview
   *
   * 执行搜索、评分、AI 摘要流程，但不写入数据库
   * 用于用户在保存前预览订阅效果
   */
  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview subscription results without saving' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiOkResponse({ description: 'Preview results' })
  async preview(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(PreviewSubscriptionQuerySchema))
    query: PreviewSubscriptionQuery,
  ) {
    return this.previewService.previewSubscription(user.id, id, query);
  }
}
