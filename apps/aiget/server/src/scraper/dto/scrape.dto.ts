/**
 * Scraper DTO - Zod Schemas
 *
 * [INPUT]: 抓取请求参数
 * [OUTPUT]: 验证后的抓取选项
 * [POS]: Zod schemas + 推断类型（用于验证）
 */

import { z } from 'zod';

// ========== 子 Schema ==========

// 截图选项 Schema
export const ScreenshotOptionsSchema = z.object({
  fullPage: z.boolean().default(false),
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().int().min(1).max(100).default(80),
  clip: z.string().optional(), // CSS 选择器，元素截图
  response: z.enum(['url', 'base64']).default('url'),
});

// PDF 边距 Schema
export const PdfMarginSchema = z.object({
  top: z.string().default('10mm'),
  right: z.string().default('10mm'),
  bottom: z.string().default('10mm'),
  left: z.string().default('10mm'),
});

// PDF 选项 Schema（仅支持 URL，不支持 base64）
export const PdfOptionsSchema = z.object({
  format: z.enum(['A4', 'Letter', 'Legal']).default('A4'),
  landscape: z.boolean().default(false),
  margin: PdfMarginSchema.optional(),
  scale: z.number().min(0.1).max(2).default(1),
  printBackground: z.boolean().default(true),
});

// 视口 Schema
export const ViewportSchema = z.object({
  width: z.number().int().min(100).max(3840).default(1280),
  height: z.number().int().min(100).max(2160).default(800),
});

// Action Schema
export const ActionSchema = z.object({
  type: z.enum(['click', 'type', 'scroll', 'wait', 'screenshot', 'press']),
  selector: z.string().optional(),
  text: z.string().optional(),
  key: z.string().optional(),
  direction: z.enum(['up', 'down']).optional(),
  amount: z.number().optional(),
  milliseconds: z.number().optional(),
});

// ========== 主请求 Schema ==========

export const ScrapeOptionsSchema = z.object({
  url: z.string().url(),
  formats: z
    .array(
      z.enum(['markdown', 'html', 'rawHtml', 'links', 'screenshot', 'pdf']),
    )
    .default(['markdown']),
  onlyMainContent: z.boolean().default(true),
  includeTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(), // 也用于隐藏元素（截图/PDF时）
  waitFor: z.union([z.number(), z.string()]).optional(),
  timeout: z.number().default(30000),
  headers: z.record(z.string(), z.string()).optional(),

  // 视口设置
  viewport: ViewportSchema.optional(),
  mobile: z.boolean().default(false),
  device: z.enum(['desktop', 'tablet', 'mobile']).optional(),
  darkMode: z.boolean().default(false),

  // 截图专用选项
  screenshotOptions: ScreenshotOptionsSchema.optional(),

  // PDF 专用选项
  pdfOptions: PdfOptionsSchema.optional(),

  // Actions (页面交互)
  actions: z.array(ActionSchema).optional(),

  // 同步/异步模式
  sync: z.boolean().default(true),
});

// ========== 推断类型 ==========

export type ScrapeOptions = z.infer<typeof ScrapeOptionsSchema>;
export type ScreenshotOptions = z.infer<typeof ScreenshotOptionsSchema>;
export type PdfOptions = z.infer<typeof PdfOptionsSchema>;
export type Action = z.infer<typeof ActionSchema>;

// 抓取格式类型
export type ScrapeFormat =
  | 'markdown'
  | 'html'
  | 'rawHtml'
  | 'links'
  | 'screenshot'
  | 'pdf';

// ========== 常量 ==========

// 设备预设
export const DEVICE_PRESETS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: {
    width: 375,
    height: 667,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  },
} as const;
