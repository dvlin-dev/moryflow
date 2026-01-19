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
  /** 自定义 User-Agent */
  userAgent: z.string().max(500).optional(),
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
