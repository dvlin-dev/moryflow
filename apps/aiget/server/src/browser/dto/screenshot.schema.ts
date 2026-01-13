/**
 * Screenshot Schema - 截图相关
 *
 * [DEFINES]: ScreenshotSchema
 * [USED_BY]: browser-session.controller.ts, browser-session.service.ts
 * [POS]: 页面截图的请求验证
 */

import { z } from 'zod';

/** 截图请求 */
export const ScreenshotSchema = z.object({
  /** 元素选择器（可选，不提供则截取整个视口） */
  selector: z.string().max(500).optional(),
  /** 是否全页截图 */
  fullPage: z.boolean().default(false),
  /** 图片格式 */
  format: z.enum(['png', 'jpeg']).default('png'),
  /** JPEG 质量（1-100） */
  quality: z.number().int().min(1).max(100).optional(),
});

export type ScreenshotInput = z.infer<typeof ScreenshotSchema>;

/** 截图响应 */
export interface ScreenshotResponse {
  /** Base64 编码的图片数据 */
  data: string;
  /** MIME 类型 */
  mimeType: string;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}
