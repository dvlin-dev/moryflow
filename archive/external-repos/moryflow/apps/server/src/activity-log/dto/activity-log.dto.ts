/**
 * ActivityLog DTOs
 * 活动日志相关的请求数据结构
 *
 * [DEFINES]: Activity log query and export schemas
 * [USED_BY]: ActivityLogController, ActivityLogService
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ==================== Query Schemas ====================

/** 查询日志请求 */
export const ActivityLogQuerySchema = z.object({
  // 用户筛选
  userId: z.string().optional(),
  email: z.string().optional(),

  // 事件筛选
  category: z.string().optional(),
  action: z.string().optional(),
  level: z.enum(['info', 'warn', 'error']).optional(),

  // 时间筛选
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  // 分页
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export class ActivityLogQueryDto extends createZodDto(ActivityLogQuerySchema) {}

/** 清理日志请求 */
export const CleanupLogsSchema = z.object({
  days: z.coerce.number().int().min(1).max(3650),
});

export class CleanupLogsDto extends createZodDto(CleanupLogsSchema) {}

/** 导出日志请求 */
export const ExportLogsSchema = z.object({
  format: z.enum(['csv', 'json']).default('json'),
  // 复用查询参数
  userId: z.string().optional(),
  email: z.string().optional(),
  category: z.string().optional(),
  action: z.string().optional(),
  level: z.enum(['info', 'warn', 'error']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export class ExportLogsDto extends createZodDto(ExportLogsSchema) {}
