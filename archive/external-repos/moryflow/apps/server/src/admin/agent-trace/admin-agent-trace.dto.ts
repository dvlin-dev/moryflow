/**
 * Admin Agent Trace DTOs
 * 管理员 Agent 追踪 API 数据传输对象
 *
 * [DEFINES]: Admin agent trace query and export schemas
 * [USED_BY]: AdminAgentTraceController, AdminAgentTraceService
 */

import { z } from 'zod';

// ==========================================
// 查询相关 Schema
// ==========================================

export const GetAdminTracesQuerySchema = z.object({
  status: z.string().optional(),
  agentName: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

export type GetAdminTracesQueryDto = z.infer<typeof GetAdminTracesQuerySchema>;

export const GetAdminFailedToolsQuerySchema = z.object({
  toolName: z.string().optional(),
  agentName: z.string().optional(),
  errorType: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

export type GetAdminFailedToolsQueryDto = z.infer<
  typeof GetAdminFailedToolsQuerySchema
>;

export const GetAdminStatsQuerySchema = z.object({
  days: z.coerce.number().optional().default(7),
});

export type GetAdminStatsQueryDto = z.infer<typeof GetAdminStatsQuerySchema>;

export const ExportTracesQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('json'),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ExportTracesQueryDto = z.infer<typeof ExportTracesQuerySchema>;
