/**
 * ActivityLog Controller
 * Admin API 用于查询、管理活动日志
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminGuard } from '../common/guards';
import { ActivityLogService } from './activity-log.service';
import {
  ActivityLogQuerySchema,
  CleanupLogsSchema,
  ExportLogsSchema,
} from './dto/activity-log.dto';

@ApiTags('ActivityLog')
@ApiCookieAuth()
@Controller('api/admin/activity-logs')
@UseGuards(AdminGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @ApiOperation({ summary: '查询活动日志' })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID' })
  @ApiQuery({
    name: 'email',
    required: false,
    description: '用户邮箱（模糊搜索）',
  })
  @ApiQuery({ name: 'category', required: false, description: '事件分类' })
  @ApiQuery({ name: 'action', required: false, description: '事件动作' })
  @ApiQuery({ name: 'level', required: false, enum: ['info', 'warn', 'error'] })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '开始时间（ISO）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '结束时间（ISO）',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: '日志列表' })
  @Get()
  async queryLogs(
    @Query('userId') userId?: string,
    @Query('email') email?: string,
    @Query('category') category?: string,
    @Query('action') action?: string,
    @Query('level') level?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsed = ActivityLogQuerySchema.safeParse({
      userId,
      email,
      category,
      action,
      level,
      startDate,
      endDate,
      limit,
      offset,
    });

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    return this.activityLogService.query(parsed.data);
  }

  @ApiOperation({ summary: '获取存储统计' })
  @ApiResponse({ status: 200, description: '存储统计信息' })
  @Get('stats')
  async getStorageStats() {
    return this.activityLogService.getStorageStats();
  }

  @ApiOperation({ summary: '导出日志' })
  @ApiResponse({ status: 200, description: '导出数据' })
  @Post('export')
  async exportLogs(
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const parsed = ExportLogsSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    const { format, ...queryParams } = parsed.data;
    const logs = await this.activityLogService.exportLogs(queryParams);
    const filename = `activity-logs-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'csv') {
      const csv = this.convertToCsv(logs as Record<string, unknown>[]);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.csv"`,
      );
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.json"`,
      );
      res.send(JSON.stringify(logs, null, 2));
    }
  }

  /** 将日志数据转换为 CSV 格式 */
  private convertToCsv(logs: Record<string, unknown>[]): string {
    const headers = [
      'id',
      'userId',
      'userEmail',
      'targetUserId',
      'targetUserEmail',
      'category',
      'action',
      'level',
      'ip',
      'duration',
      'createdAt',
      'details',
    ];

    const rows = logs.map((log) =>
      headers.map((h) => {
        const value = log[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object')
          return JSON.stringify(value).replace(/"/g, '""');
        return String(value).replace(/"/g, '""');
      }),
    );

    return [
      headers.join(','),
      ...rows.map((row) => `"${row.join('","')}"`),
    ].join('\n');
  }

  @ApiOperation({ summary: '清理旧日志' })
  @ApiResponse({ status: 200, description: '清理结果' })
  @Post('cleanup')
  async cleanupLogs(@Body() body: { days: number }) {
    const parsed = CleanupLogsSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    return this.activityLogService.deleteOlderThan(parsed.data.days);
  }
}
