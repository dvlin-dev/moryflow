/**
 * Headers Schema - 请求头管理
 *
 * [DEFINES]: SetHeadersSchema, ClearHeadersSchema
 * [USED_BY]: browser-session.controller.ts, browser-session.service.ts
 * [POS]: 全局/Origin scoped headers 管理
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { z } from 'zod';

export const SetHeadersSchema = z.object({
  /** 指定 origin（不填则设置为全局 headers） */
  origin: z.string().max(500).optional(),
  /** headers 键值 */
  headers: z.record(z.string(), z.string()),
});

export type SetHeadersInput = z.infer<typeof SetHeadersSchema>;

export const ClearHeadersSchema = z.object({
  /** 指定 origin（不填则清除所有 scoped headers） */
  origin: z.string().max(500).optional(),
  /** 是否清除全局 headers */
  clearGlobal: z.boolean().optional(),
});

export type ClearHeadersInput = z.infer<typeof ClearHeadersSchema>;
