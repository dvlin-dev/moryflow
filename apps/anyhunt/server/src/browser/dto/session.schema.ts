/**
 * Session Schema - 会话管理
 *
 * [DEFINES]: CreateSessionSchema, OpenUrlSchema
 * [USED_BY]: browser-session.controller.ts, browser-session.service.ts
 * [POS]: 会话创建和 URL 打开的请求验证
 */

import { z } from 'zod';

/** 创建会话请求 */
export const CreateSessionSchema = z.object({
  /** 视口配置 */
  viewport: z
    .object({
      width: z.number().int().min(320).max(3840).default(1280),
      height: z.number().int().min(240).max(2160).default(800),
    })
    .optional(),
  /** 自定义 User-Agent */
  userAgent: z.string().max(500).optional(),
  /** 会话超时时间（毫秒，默认 5 分钟） */
  timeout: z.number().int().min(10000).max(1800000).default(300000),
  /** 是否启用 JavaScript */
  javaScriptEnabled: z.boolean().default(true),
  /** 是否忽略 HTTPS 错误 */
  ignoreHTTPSErrors: z.boolean().default(true),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

/** 打开 URL 请求 */
export const OpenUrlSchema = z.object({
  /** 要打开的 URL */
  url: z.string().url(),
  /** 等待条件 */
  waitUntil: z
    .enum(['load', 'domcontentloaded', 'networkidle', 'commit'])
    .default('domcontentloaded'),
  /** 超时时间（毫秒） */
  timeout: z.number().int().min(1000).max(60000).default(30000),
});

export type OpenUrlInput = z.infer<typeof OpenUrlSchema>;
