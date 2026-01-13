/**
 * Digest Console Run Controller
 *
 * [INPUT]: 运行历史查询请求
 * [OUTPUT]: DigestRun, DigestRunItem 列表
 * [POS]: Console 运行历史 API（Session 认证）
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { CurrentUserDto } from '../../types';
import { DigestRunService } from '../services/run.service';
import { ListRunsQuerySchema, type ListRunsQuery } from '../dto';

@ApiTags('Console - Digest Runs')
@ApiCookieAuth()
@Controller({
  path: 'console/digest/subscriptions/:subscriptionId/runs',
  version: '1',
})
export class DigestConsoleRunController {
  constructor(private readonly runService: DigestRunService) {}

  /**
   * 获取订阅的运行历史
   * GET /api/console/digest/subscriptions/:subscriptionId/runs
   */
  @Get()
  @ApiOperation({ summary: 'List subscription runs' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiOkResponse({ description: 'Run list with pagination' })
  async findAll(
    @CurrentUser() user: CurrentUserDto,
    @Param('subscriptionId') subscriptionId: string,
    @Query(new ZodValidationPipe(ListRunsQuerySchema)) query: ListRunsQuery,
  ) {
    const { items, nextCursor } = await this.runService.findMany(
      user.id,
      subscriptionId,
      query,
    );

    return {
      items: items.map((run) => ({
        id: run.id,
        subscriptionId: run.subscriptionId,
        scheduledAt: run.scheduledAt,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        status: run.status,
        source: run.source,
        outputLocale: run.outputLocale,
        result: run.result,
        billing: run.billing,
        error: run.error,
      })),
      nextCursor,
    };
  }

  /**
   * 获取单个运行详情
   * GET /api/console/digest/subscriptions/:subscriptionId/runs/:runId
   */
  @Get(':runId')
  @ApiOperation({ summary: 'Get run details' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiParam({ name: 'runId', description: 'Run ID' })
  @ApiOkResponse({ description: 'Run details with items' })
  async findOne(
    @CurrentUser() user: CurrentUserDto,
    @Param('subscriptionId') subscriptionId: string,
    @Param('runId') runId: string,
  ) {
    const run = await this.runService.findOne(user.id, runId);

    if (!run || run.subscriptionId !== subscriptionId) {
      return null;
    }

    const items = await this.runService.findRunItems(runId);

    return {
      run: {
        id: run.id,
        subscriptionId: run.subscriptionId,
        scheduledAt: run.scheduledAt,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        status: run.status,
        source: run.source,
        outputLocale: run.outputLocale,
        narrativeMarkdown: run.narrativeMarkdown,
        result: run.result,
        billing: run.billing,
        error: run.error,
      },
      items: items.map((item) => ({
        id: item.id,
        contentId: item.contentId,
        canonicalUrlHash: item.canonicalUrlHash,
        rank: item.rank,
        scoreRelevance: item.scoreRelevance,
        scoreOverall: item.scoreOverall,
        scoringReason: item.scoringReason,
        titleSnapshot: item.titleSnapshot,
        urlSnapshot: item.urlSnapshot,
        aiSummarySnapshot: item.aiSummarySnapshot,
        deliveredAt: item.deliveredAt,
      })),
    };
  }
}
