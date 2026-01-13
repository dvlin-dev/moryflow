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
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RequireAdmin, CurrentUser } from '../../auth';
import type { CurrentUserDto } from '../../types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DigestAdminService } from '../services/admin.service';
import { DigestReportService } from '../services/report.service';
import {
  ResolveReportSchema,
  type ListReportsQuery,
  type ResolveReportInput,
} from '../dto';
import type {
  DigestTopicVisibility,
  DigestTopicStatus,
  DigestRunStatus,
  DigestTopicReportStatus,
} from '../../../generated/prisma-main/client';

@ApiTags('Admin - Digest')
@ApiSecurity('session')
@Controller({ path: 'admin/digest', version: '1' })
@RequireAdmin()
export class DigestAdminController {
  constructor(
    private readonly adminService: DigestAdminService,
    private readonly reportService: DigestReportService,
  ) {}

  /**
   * 获取 Digest 系统统计
   * GET /api/v1/admin/digest/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get digest system statistics' })
  @ApiOkResponse({ description: 'System statistics' })
  async getStats() {
    return this.adminService.getStats();
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
    return this.adminService.listSubscriptions({
      cursor,
      limit: parseInt(limit, 10) || 20,
      userId,
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
    });
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
    return this.adminService.listTopics({
      cursor,
      limit: parseInt(limit, 10) || 20,
      visibility: visibility as DigestTopicVisibility | undefined,
      status: status as DigestTopicStatus | undefined,
    });
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
    return this.adminService.updateTopicStatus(id, body.status);
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
    await this.adminService.deleteTopic(id);
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
    return this.adminService.listRuns({
      cursor,
      limit: parseInt(limit, 10) || 20,
      status: status as DigestRunStatus | undefined,
      subscriptionId,
    });
  }

  // ============= Report Management =============

  /**
   * 获取举报列表
   * GET /api/v1/admin/digest/reports
   */
  @Get('reports')
  @ApiOperation({ summary: 'List topic reports' })
  @ApiOkResponse({ description: 'Report list with pagination' })
  async listReports(
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('topicId') topicId?: string,
  ) {
    const query: ListReportsQuery = {
      cursor,
      limit: parseInt(limit, 10) || 20,
      status: status as DigestTopicReportStatus | undefined,
      topicId,
    };

    const { items, nextCursor } = await this.reportService.findMany(query);

    return {
      items: items.map((r) => this.reportService.toResponse(r)),
      nextCursor,
      pendingCount: await this.reportService.getPendingCount(),
    };
  }

  /**
   * 获取举报详情
   * GET /api/v1/admin/digest/reports/:id
   */
  @Get('reports/:id')
  @ApiOperation({ summary: 'Get report details' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiOkResponse({ description: 'Report details' })
  async getReport(@Param('id') id: string) {
    const report = await this.reportService.findById(id);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return this.reportService.toResponse(report);
  }

  /**
   * 处理举报
   * PATCH /api/v1/admin/digest/reports/:id
   */
  @Patch('reports/:id')
  @ApiOperation({ summary: 'Resolve a report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiOkResponse({ description: 'Report resolved' })
  async resolveReport(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ResolveReportSchema)) input: ResolveReportInput,
    @CurrentUser() user: CurrentUserDto,
  ) {
    const report = await this.reportService.resolve(id, user.id, input);

    return this.reportService.toResponse(report);
  }
}
