/**
 * [INPUT]: Admin 查询参数（requests/overview/users/ip）
 * [OUTPUT]: RequestLog 明细与聚合结果
 * [POS]: Admin RequestLog 查询 API（仅管理员）
 */

import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  requestLogIpQuerySchema,
  requestLogListQuerySchema,
  requestLogOverviewQuerySchema,
  requestLogUsersQuerySchema,
  type RequestLogIpQuery,
  type RequestLogListQuery,
  type RequestLogOverviewQuery,
  type RequestLogUsersQuery,
} from './dto';
import { RequestLogService } from './request-log.service';

@ApiTags('Admin - Logs')
@ApiSecurity('session')
@Controller({ path: 'admin/logs', version: '1' })
@RequireAdmin()
export class RequestLogController {
  constructor(private readonly requestLogService: RequestLogService) {}

  @Get('requests')
  @ApiOperation({ summary: 'Get request logs with filters and pagination' })
  @ApiOkResponse({ description: 'Request log list' })
  async getRequests(
    @Query(new ZodValidationPipe(requestLogListQuerySchema))
    query: RequestLogListQuery,
  ) {
    return this.requestLogService.getRequests(query);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get request overview metrics' })
  @ApiOkResponse({ description: 'Overview metrics' })
  async getOverview(
    @Query(new ZodValidationPipe(requestLogOverviewQuerySchema))
    query: RequestLogOverviewQuery,
  ) {
    return this.requestLogService.getOverview(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user behavior metrics from request logs' })
  @ApiOkResponse({ description: 'User behavior metrics' })
  async getUsers(
    @Query(new ZodValidationPipe(requestLogUsersQuerySchema))
    query: RequestLogUsersQuery,
  ) {
    return this.requestLogService.getUsers(query);
  }

  @Get('ip')
  @ApiOperation({ summary: 'Get IP monitoring metrics from request logs' })
  @ApiOkResponse({ description: 'IP monitoring metrics' })
  async getIpStats(
    @Query(new ZodValidationPipe(requestLogIpQuerySchema))
    query: RequestLogIpQuery,
  ) {
    return this.requestLogService.getIpStats(query);
  }
}
