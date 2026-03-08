/**
 * Diagnostics Schema - 调试与观测
 *
 * [DEFINES]: TraceStartSchema, TraceStopSchema, LogQuerySchema
 * [USED_BY]: browser-session.controller.ts, browser-session.service.ts
 * [POS]: Trace/Console/Error/Har/Recording 相关请求验证
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { z } from 'zod';

export const TraceStartSchema = z.object({
  screenshots: z.boolean().optional(),
  snapshots: z.boolean().optional(),
});

export type TraceStartInput = z.infer<typeof TraceStartSchema>;

export const TraceStopSchema = z.object({
  store: z.boolean().optional(),
});

export type TraceStopInput = z.infer<typeof TraceStopSchema>;

export const HarStartSchema = z.object({
  clear: z.boolean().optional(),
});

export type HarStartInput = z.infer<typeof HarStartSchema>;

export const HarStopSchema = z.object({
  includeRequests: z.boolean().optional().default(true),
});

export type HarStopInput = z.infer<typeof HarStopSchema>;

export const LogQuerySchema = z.object({
  limit: z.number().int().min(1).max(500).optional(),
});

export type LogQueryInput = z.infer<typeof LogQuerySchema>;
