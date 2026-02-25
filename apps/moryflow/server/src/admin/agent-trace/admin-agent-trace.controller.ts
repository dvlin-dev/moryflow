/**
 * Admin Agent Trace Controller
 * 管理员 Agent 追踪 API
 *
 * [INPUT]: Query params for filtering/pagination
 * [OUTPUT]: Agent traces, spans, and statistics
 * [POS]: 管理员专用 API，可查看所有用户数据
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AdminGuard } from '../../common/guards';
import { AdminAgentTraceService } from './admin-agent-trace.service';
import { AgentTraceCleanupService } from '../../agent-trace';
import {
  GetAdminTracesQuerySchema,
  GetAdminFailedToolsQuerySchema,
  GetAdminStatsQuerySchema,
} from './admin-agent-trace.dto';

@ApiTags('Admin - Agent Traces')
@Controller({ path: 'admin/agent-traces', version: '1' })
@UseGuards(AdminGuard)
export class AdminAgentTraceController {
  constructor(
    private readonly service: AdminAgentTraceService,
    private readonly cleanupService: AgentTraceCleanupService,
  ) {}

  // ==========================================
  // 统计接口
  // ==========================================

  @ApiOperation({
    summary: '获取统计概览',
    description: '获取 Agent 追踪统计数据，包括趋势和分布',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '统计天数（默认 7）',
  })
  @ApiResponse({ status: 200, description: '统计数据' })
  @Get('stats')
  async getStats(@Query('days') days?: string) {
    const parsed = GetAdminStatsQuerySchema.safeParse({ days });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.service.getStats(parsed.data);
  }

  @ApiOperation({
    summary: '获取 Tool 统计',
    description: '获取所有 Tool 的调用统计',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '统计天数（默认 7）',
  })
  @ApiResponse({ status: 200, description: 'Tool 统计数据' })
  @Get('stats/tools')
  async getToolStats(@Query('days') days?: string) {
    const parsed = GetAdminStatsQuerySchema.safeParse({ days });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.service.getToolStats(parsed.data);
  }

  @ApiOperation({
    summary: '获取 Agent 统计',
    description: '获取所有 Agent 的执行统计',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '统计天数（默认 30）',
  })
  @ApiResponse({ status: 200, description: 'Agent 统计数据' })
  @Get('stats/agents')
  async getAgentStats(@Query('days') days?: string) {
    const parsed = GetAdminStatsQuerySchema.safeParse({ days: days || '30' });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.service.getAgentStats(parsed.data);
  }

  // ==========================================
  // 列表接口
  // ==========================================

  @ApiOperation({
    summary: '获取 Traces 列表',
    description: '获取所有用户的 Agent 执行记录',
  })
  @ApiQuery({ name: 'status', required: false, description: '状态筛选' })
  @ApiQuery({
    name: 'agentName',
    required: false,
    description: 'Agent 名称筛选',
  })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID 筛选' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始时间' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束时间' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'offset', required: false, description: '偏移量' })
  @ApiResponse({ status: 200, description: 'Traces 列表' })
  @Get()
  async getTraces(
    @Query('status') status?: string,
    @Query('agentName') agentName?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsed = GetAdminTracesQuerySchema.safeParse({
      status,
      agentName,
      userId,
      startDate,
      endDate,
      limit,
      offset,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.service.getTraces(parsed.data);
  }

  @ApiOperation({
    summary: '获取失败的 Tool 列表',
    description: '获取所有失败的 Tool 调用记录',
  })
  @ApiQuery({ name: 'toolName', required: false, description: 'Tool 名称筛选' })
  @ApiQuery({
    name: 'agentName',
    required: false,
    description: 'Agent 名称筛选',
  })
  @ApiQuery({ name: 'errorType', required: false, description: '错误类型筛选' })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID 筛选' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始时间' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束时间' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'offset', required: false, description: '偏移量' })
  @ApiResponse({ status: 200, description: '失败 Tool 列表' })
  @Get('failed-tools')
  async getFailedTools(
    @Query('toolName') toolName?: string,
    @Query('agentName') agentName?: string,
    @Query('errorType') errorType?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsed = GetAdminFailedToolsQuerySchema.safeParse({
      toolName,
      agentName,
      errorType,
      userId,
      startDate,
      endDate,
      limit,
      offset,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.service.getFailedTools(parsed.data);
  }

  // ==========================================
  // 存储管理接口（必须在 :traceId 之前定义）
  // ==========================================

  @ApiOperation({
    summary: '获取存储统计',
    description: '获取 Agent Trace 存储统计和待清理数据量',
  })
  @ApiResponse({ status: 200, description: '存储统计' })
  @Get('storage/stats')
  async getStorageStats() {
    const [cleanupStats, totalStats] = await Promise.all([
      this.cleanupService.getCleanupStats(),
      this.service.getStorageStats(),
    ]);
    return {
      ...cleanupStats,
      ...totalStats,
    };
  }

  @ApiOperation({
    summary: '手动触发清理',
    description: '立即执行日志清理任务',
  })
  @ApiResponse({ status: 200, description: '清理结果' })
  @Post('storage/cleanup')
  async triggerCleanup() {
    const result = await this.cleanupService.triggerCleanup();
    return {
      success: true,
      message: `Cleanup completed: deleted ${result.deletedCount} traces in ${result.duration}ms`,
      ...result,
    };
  }

  // ==========================================
  // 详情接口（参数化路由必须放在最后）
  // ==========================================

  @ApiOperation({
    summary: '获取 Trace 详情',
    description: '获取单个 Trace 的完整信息（包含所有 Spans）',
  })
  @ApiResponse({ status: 200, description: 'Trace 详情' })
  @ApiResponse({ status: 404, description: 'Trace 不存在' })
  @Get(':traceId')
  async getTraceDetail(@Param('traceId') traceId: string) {
    const trace = await this.service.getTraceDetail(traceId);
    if (!trace) {
      throw new NotFoundException(`Trace not found: ${traceId}`);
    }
    return trace;
  }
}
