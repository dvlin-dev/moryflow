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
  Post,
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
  AdminTopicsQuerySchema,
  AdminListSubscriptionsQuerySchema,
  AdminListRunsQuerySchema,
  SetFeaturedSchema,
  ReorderFeaturedSchema,
  UpdateTopicStatusSchema,
  ResolveReportSchema,
  ListReportsQuerySchema,
  type AdminTopicsQuery,
  type AdminListSubscriptionsQuery,
  type AdminListRunsQuery,
  type SetFeaturedInput,
  type ReorderFeaturedInput,
  type UpdateTopicStatusInput,
  type ListReportsQuery,
  type ResolveReportInput,
} from '../dto';

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
    @Query(new ZodValidationPipe(AdminListSubscriptionsQuerySchema))
    query: AdminListSubscriptionsQuery,
  ) {
    return this.adminService.listSubscriptions(query);
  }

  /**
   * 获取话题列表（管理员视图，page/limit）
   * GET /api/v1/admin/digest/topics
   */
  @Get('topics')
  @ApiOperation({ summary: 'List topics (admin)' })
  @ApiOkResponse({ description: 'Topic list with pagination' })
  async listTopics(
    @Query(new ZodValidationPipe(AdminTopicsQuerySchema))
    query: AdminTopicsQuery,
  ) {
    return this.adminService.listTopics(query);
  }

  /**
   * 获取精选话题列表（Admin 视角，不过滤 visibility/status）
   * GET /api/v1/admin/digest/topics/featured
   */
  @Get('topics/featured')
  @ApiOperation({ summary: 'Get featured topics' })
  @ApiOkResponse({ description: 'Featured topics' })
  async getFeaturedTopics() {
    return this.adminService.getFeaturedTopics();
  }

  /**
   * 获取单个话题详情
   * GET /api/v1/admin/digest/topics/:id
   */
  @Get('topics/:id')
  @ApiOperation({ summary: 'Get topic by ID' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiOkResponse({ description: 'Topic details' })
  async getTopic(@Param('id') id: string) {
    return this.adminService.getTopic(id);
  }

  /**
   * 设置/取消精选
   * PATCH /api/v1/admin/digest/topics/:id/featured
   */
  @Patch('topics/:id/featured')
  @ApiOperation({ summary: 'Set or unset topic as featured' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiOkResponse({ description: 'Updated topic' })
  async setFeatured(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(SetFeaturedSchema)) input: SetFeaturedInput,
  ) {
    return this.adminService.setFeatured(id, user.id, input);
  }

  /**
   * 批量重排精选顺序
   * POST /api/v1/admin/digest/topics/featured/reorder
   */
  @Post('topics/featured/reorder')
  @ApiOperation({ summary: 'Reorder featured topics' })
  @ApiOkResponse({ description: 'Reordered featured topics' })
  async reorderFeatured(
    @Body(new ZodValidationPipe(ReorderFeaturedSchema))
    input: ReorderFeaturedInput,
  ) {
    return this.adminService.reorderFeatured(input);
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
    @Body(new ZodValidationPipe(UpdateTopicStatusSchema))
    body: UpdateTopicStatusInput,
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
    @Query(new ZodValidationPipe(AdminListRunsQuerySchema))
    query: AdminListRunsQuery,
  ) {
    return this.adminService.listRuns(query);
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
    // 兼容 query string 输入，统一走 ZodValidationPipe 做校验/默认值
    @Query(new ZodValidationPipe(ListReportsQuerySchema))
    query: ListReportsQuery,
  ) {
    const { items, total, page, limit, totalPages } =
      await this.reportService.findMany(query);

    return {
      items: items.map((r) => this.reportService.toResponse(r)),
      total,
      page,
      limit,
      totalPages,
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
