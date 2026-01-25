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
  /** 设备预设（Playwright devices 名称） */
  device: z.string().max(100).optional(),
  /** 自定义 User-Agent */
  userAgent: z.string().max(500).optional(),
  /** 会话超时时间（毫秒，默认 5 分钟） */
  timeout: z.number().int().min(10000).max(1800000).default(300000),
  /** 是否启用 JavaScript */
  javaScriptEnabled: z.boolean().default(true),
  /** 是否忽略 HTTPS 错误 */
  ignoreHTTPSErrors: z.boolean().default(true),
  /** locale（需要新建 context 才生效） */
  locale: z.string().max(50).optional(),
  /** timezoneId（需要新建 context 才生效） */
  timezoneId: z.string().max(50).optional(),
  /** geolocation */
  geolocation: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).max(10000).optional(),
    })
    .optional(),
  /** permissions */
  permissions: z.array(z.string()).max(50).optional(),
  /** media */
  colorScheme: z.enum(['light', 'dark', 'no-preference']).optional(),
  reducedMotion: z.enum(['reduce', 'no-preference']).optional(),
  /** offline（运行时可切换） */
  offline: z.boolean().optional(),
  /** 全局 headers */
  headers: z.record(z.string(), z.string()).optional(),
  /** HTTP 基本认证 */
  httpCredentials: z
    .object({
      username: z.string().min(1).max(200),
      password: z.string().min(1).max(200),
    })
    .optional(),
  /** 是否接受下载 */
  acceptDownloads: z.boolean().optional(),
  /** 录屏（视频） */
  recordVideo: z
    .object({
      enabled: z.boolean().default(false),
      width: z.number().int().min(320).max(3840).optional(),
      height: z.number().int().min(240).max(2160).optional(),
    })
    .optional(),
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
  /** scoped headers（仅对当前 origin 生效） */
  headers: z.record(z.string(), z.string()).optional(),
});

export type OpenUrlInput = z.infer<typeof OpenUrlSchema>;
