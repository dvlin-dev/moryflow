/**
 * Profile Schema - 会话 Profile 持久化
 *
 * [DEFINES]: SaveProfileSchema, LoadProfileSchema
 * [USED_BY]: browser-session.controller.ts, browser-session.service.ts
 * [POS]: Profile 保存/加载请求验证
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';

export const SaveProfileSchema = z.object({
  /** 复用已有 profileId（可选，不传则生成） */
  profileId: z.string().max(64).optional(),
  /** 是否包含 sessionStorage */
  includeSessionStorage: z.boolean().optional().default(false),
});

export type SaveProfileInput = z.infer<typeof SaveProfileSchema>;

export const LoadProfileSchema = z.object({
  profileId: z.string().max(64),
});

export type LoadProfileInput = z.infer<typeof LoadProfileSchema>;
