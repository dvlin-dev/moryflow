/**
 * Digest Admin Controller
 *
 * [INPUT]: 管理员管理请求
 * [OUTPUT]: 全局统计、话题/订阅管理
 * [POS]: Admin 管理 API（Admin Guard）
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RequireAdmin } from '../../auth';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DigestTopicVisibility,
  DigestTopicStatus,
  DigestRunStatus,
} from '../../../generated/prisma-main/client';

@ApiTags('Admin - Digest')
@ApiSecurity('session')
@Controller({ path: 'admin/digest', version: '1' })
@RequireAdmin()
export class DigestAdminController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取 Digest 系统统计
   * GET /api/v1/admin/digest/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get digest system statistics' })
  @ApiOkResponse({ description: 'System statistics' })
  async getStats() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      totalTopics,
      publicTopics,
      totalRuns,
      successfulRuns,
      failedRuns,
      totalContent,
    ] = await Promise.all([
      this.prisma.digestSubscription.count({ where: { deletedAt: null } }),
      this.prisma.digestSubscription.count({
        where: { deletedAt: null, enabled: true },
      }),
      this.prisma.digestTopic.count(),
      this.prisma.digestTopic.count({ where: { visibility: 'PUBLIC' } }),
      this.prisma.digestRun.count(),
      this.prisma.digestRun.count({ where: { status: 'SUCCEEDED' } }),
      this.prisma.digestRun.count({ where: { status: 'FAILED' } }),
      this.prisma.contentItem.count(),
    ]);

    return {
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
      },
      topics: {
        total: totalTopics,
        public: publicTopics,
      },
      runs: {
        total: totalRuns,
        succeeded: successfulRuns,
        failed: failedRuns,
        successRate:
          totalRuns > 0
            ? Math.round((successfulRuns / totalRuns) * 100 * 100) / 100
            : 0,
      },
      contentPool: {
        totalItems: totalContent,
      },
    };
  }

  /**
   * 获取订阅列表（管理员视图）
   * GET /api/v1/admin/digest/subscriptions
   */
  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions (admin)' })
  @ApiOkResponse({ description: 'Subscription list with pagination' })
  async listSubscriptions(
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
    @Query('enabled') enabled?: string,
  ) {
    const take = Math.min(parseInt(limit, 10) || 20, 100);

    const subscriptions = await this.prisma.digestSubscription.findMany({
      where: {
        deletedAt: null,
        ...(userId && { userId }),
        ...(enabled !== undefined && { enabled: enabled === 'true' }),
      },
      take: take + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { runs: true } },
      },
    });

    const hasMore = subscriptions.length > take;
    if (hasMore) {
      subscriptions.pop();
    }

    return {
      items: subscriptions.map((s) => ({
        id: s.id,
        name: s.name,
        topic: s.topic,
        interests: s.interests,
        enabled: s.enabled,
        cron: s.cron,
        lastRunAt: s.lastRunAt,
        nextRunAt: s.nextRunAt,
        createdAt: s.createdAt,
        user: s.user,
        runCount: s._count.runs,
      })),
      nextCursor: hasMore ? subscriptions[subscriptions.length - 1]?.id : null,
    };
  }

  /**
   * 获取话题列表（管理员视图）
   * GET /api/v1/admin/digest/topics
   */
  @Get('topics')
  @ApiOperation({ summary: 'List all topics (admin)' })
  @ApiOkResponse({ description: 'Topic list with pagination' })
  async listTopics(
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '20',
    @Query('visibility') visibility?: string,
    @Query('status') status?: string,
  ) {
    const take = Math.min(parseInt(limit, 10) || 20, 100);

    const topics = await this.prisma.digestTopic.findMany({
      where: {
        ...(visibility && { visibility: visibility as DigestTopicVisibility }),
        ...(status && { status: status as DigestTopicStatus }),
      },
      take: take + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        _count: { select: { editions: true } },
      },
    });

    const hasMore = topics.length > take;
    if (hasMore) {
      topics.pop();
    }

    return {
      items: topics.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        visibility: t.visibility,
        status: t.status,
        subscriberCount: t.subscriberCount,
        lastEditionAt: t.lastEditionAt,
        createdAt: t.createdAt,
        createdBy: t.createdBy,
        editionCount: t._count.editions,
      })),
      nextCursor: hasMore ? topics[topics.length - 1]?.id : null,
    };
  }

  /**
   * 更新话题状态
   * PATCH /api/v1/admin/digest/topics/:id/status
   */
  @Patch('topics/:id/status')
  @ApiOperation({ summary: 'Update topic status' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiOkResponse({ description: 'Topic status updated' })
  async updateTopicStatus(
    @Param('id') id: string,
    @Body() body: { status: DigestTopicStatus },
  ) {
    const topic = await this.prisma.digestTopic.update({
      where: { id },
      data: { status: body.status },
    });

    return {
      id: topic.id,
      status: topic.status,
    };
  }

  /**
   * 删除话题（硬删除）
   * DELETE /api/v1/admin/digest/topics/:id
   */
  @Delete('topics/:id')
  @ApiOperation({ summary: 'Delete topic (hard delete)' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiNoContentResponse({ description: 'Topic deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTopic(@Param('id') id: string): Promise<void> {
    await this.prisma.digestTopic.delete({ where: { id } });
  }

  /**
   * 获取运行历史（管理员视图）
   * GET /api/v1/admin/digest/runs
   */
  @Get('runs')
  @ApiOperation({ summary: 'List all runs (admin)' })
  @ApiOkResponse({ description: 'Run list with pagination' })
  async listRuns(
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('subscriptionId') subscriptionId?: string,
  ) {
    const take = Math.min(parseInt(limit, 10) || 20, 100);

    const runs = await this.prisma.digestRun.findMany({
      where: {
        ...(status && { status: status as DigestRunStatus }),
        ...(subscriptionId && { subscriptionId }),
      },
      take: take + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { scheduledAt: 'desc' },
      include: {
        subscription: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
    });

    const hasMore = runs.length > take;
    if (hasMore) {
      runs.pop();
    }

    return {
      items: runs.map((r) => ({
        id: r.id,
        subscriptionId: r.subscriptionId,
        subscriptionName: r.subscription?.name,
        userId: r.userId,
        userEmail: r.user?.email,
        scheduledAt: r.scheduledAt,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        status: r.status,
        source: r.source,
        result: r.result,
        billing: r.billing,
        error: r.error,
      })),
      nextCursor: hasMore ? runs[runs.length - 1]?.id : null,
    };
  }
}
