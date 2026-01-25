/**
 * Window Schema - 多窗口管理
 *
 * [DEFINES]: CreateWindowSchema, WindowInfo
 * [USED_BY]: browser-session.controller.ts, session.manager.ts
 * [POS]: 多窗口管理的请求验证（独立 BrowserContext，隔离 cookies/storage）
 */

import { z } from 'zod';

/** 创建窗口请求（独立 BrowserContext，隔离 cookies/storage） */
export const CreateWindowSchema = z.object({
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
  /** locale */
  locale: z.string().max(50).optional(),
  /** timezoneId */
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
  /** offline */
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

export type CreateWindowInput = z.infer<typeof CreateWindowSchema>;

/** 窗口信息 */
export interface WindowInfo {
  /** 窗口索引 */
  index: number;
  /** 当前 URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 是否为活跃窗口 */
  active: boolean;
  /** 标签页数量 */
  tabCount: number;
}
