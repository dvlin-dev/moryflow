/**
 * Agent Trace Controller
 * Agent 日志上报和查询 API
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard, CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types/user.types';
import { AgentTraceService } from './agent-trace.service';
import {
  UploadTracesDto,
  GetTracesQueryDto,
  GetFailedToolsQueryDto,
  GetToolStatsQueryDto,
} from './dto/agent-trace.dto';

@ApiTags('Agent Trace')
@ApiBearerAuth('bearer')
@ApiCookieAuth('better-auth.session_token')
@Controller('v1/agent-traces')
@UseGuards(AuthGuard)
export class AgentTraceController {
  constructor(private readonly service: AgentTraceService) {}

  // ==========================================
  // 上报接口
  // ==========================================

  /**
   * 上报 Agent Traces
   * POST /v1/agent-traces
   */
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '上报 Agent Traces' })
  @ApiResponse({ status: 204, description: '上报成功' })
  async uploadTraces(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: UploadTracesDto,
  ) {
    await this.service.saveTraces(user.id, body.traces);
  }

  // ==========================================
  // 查询接口
  // ==========================================

  /**
   * 获取 Traces 列表
   * GET /v1/agent-traces
   */
  @Get()
  @ApiOperation({ summary: '获取 Traces 列表' })
  @ApiOkResponse({ description: 'Traces 列表' })
  async getTraces(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetTracesQueryDto,
  ) {
    return this.service.getTraces(user.id, query);
  }

  /**
   * 获取失败的 Tool 调用列表
   * GET /v1/agent-traces/tools/failed
   * 注意：必须放在 :traceId 路由之前，否则会被错误匹配
   */
  @Get('tools/failed')
  @ApiOperation({ summary: '获取失败的 Tool 调用列表' })
  @ApiOkResponse({ description: '失败的 Tool 调用列表' })
  async getFailedTools(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetFailedToolsQueryDto,
  ) {
    return this.service.getFailedTools(user.id, query);
  }

  /**
   * 获取 Tool 统计信息
   * GET /v1/agent-traces/stats/tools
   */
  @Get('stats/tools')
  @ApiOperation({ summary: '获取 Tool 统计信息' })
  @ApiOkResponse({ description: 'Tool 统计数据' })
  async getToolStats(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetToolStatsQueryDto,
  ) {
    return this.service.getToolStats(user.id, query);
  }

  /**
   * 获取 Agent 统计信息
   * GET /v1/agent-traces/stats/agents
   */
  @Get('stats/agents')
  @ApiOperation({ summary: '获取 Agent 统计信息' })
  @ApiOkResponse({ description: 'Agent 统计数据' })
  async getAgentStats(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetToolStatsQueryDto,
  ) {
    return this.service.getAgentStats(user.id, query);
  }

  /**
   * 获取 Trace 详情
   * GET /v1/agent-traces/:traceId
   * 注意：参数路由必须放在最后
   */
  @Get(':traceId')
  @ApiOperation({ summary: '获取 Trace 详情' })
  @ApiOkResponse({ description: 'Trace 详情' })
  @ApiParam({ name: 'traceId', description: 'Trace ID' })
  async getTraceDetail(
    @CurrentUser() user: CurrentUserDto,
    @Param('traceId') traceId: string,
  ) {
    return this.service.getTraceDetail(user.id, traceId);
  }
}
