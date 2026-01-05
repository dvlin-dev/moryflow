/**
 * Agent Trace DTOs
 * 使用 Zod 进行运行时验证
 *
 * [DEFINES]: Agent trace upload and query schemas
 * [USED_BY]: AgentTraceController, AgentTraceService
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ==========================================
// 上报相关 Schema
// ==========================================

export const SpanPayloadSchema = z.object({
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  type: z.string(),
  name: z.string(),
  status: z.string(),
  duration: z.number().optional(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  errorType: z.string().optional(),
  errorMessage: z.string().optional(),
  errorStack: z.string().optional(),
  tokens: z.number().optional(),
});

export type SpanPayloadDto = z.infer<typeof SpanPayloadSchema>;

export const TracePayloadSchema = z.object({
  traceId: z.string(),
  groupId: z.string().optional(),
  agentName: z.string(),
  agentType: z.string().optional(),
  status: z.string(),
  turnCount: z.number().optional(),
  totalTokens: z.number().optional(),
  duration: z.number().optional(),
  errorType: z.string().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  spans: z.array(SpanPayloadSchema),
});

export type TracePayloadDto = z.infer<typeof TracePayloadSchema>;

export const UploadTracesSchema = z.object({
  traces: z.array(TracePayloadSchema),
});

export class UploadTracesDto extends createZodDto(UploadTracesSchema) {}

// ==========================================
// 查询相关 Schema
// ==========================================

export const GetTracesQuerySchema = z.object({
  status: z.string().optional(),
  agentName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

export class GetTracesQueryDto extends createZodDto(GetTracesQuerySchema) {}

export const GetFailedToolsQuerySchema = z.object({
  toolName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

export class GetFailedToolsQueryDto extends createZodDto(GetFailedToolsQuerySchema) {}

export const GetToolStatsQuerySchema = z.object({
  days: z.coerce.number().optional(),
});

export class GetToolStatsQueryDto extends createZodDto(GetToolStatsQuerySchema) {}
