/**
 * Stream Schema - 浏览器流式预览
 *
 * [DEFINES]: CreateStreamSchema
 * [USED_BY]: browser-session.controller.ts, browser-session.service.ts
 * [POS]: WebSocket streaming token 创建
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { z } from 'zod';

export const CreateStreamSchema = z.object({
  /** token 过期时间（秒） */
  expiresIn: z.number().int().min(30).max(3600).optional(),
});

export type CreateStreamInput = z.infer<typeof CreateStreamSchema>;
