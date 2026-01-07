/**
 * oEmbed 请求 DTO
 */
import { z } from 'zod';

export const oembedRequestSchema = z.object({
  /** 要获取 oEmbed 数据的 URL */
  url: z.string().url('Invalid URL format'),

  /** 最大宽度 */
  maxwidth: z.number().int().min(1).max(4096).optional(),

  /** 最大高度 */
  maxheight: z.number().int().min(1).max(4096).optional(),

  /** 响应格式（接受任意值，controller 中验证） */
  format: z.string().optional(),

  /** 主题（部分平台支持） */
  theme: z.enum(['light', 'dark']).optional(),
});

export type OembedRequestDto = z.infer<typeof oembedRequestSchema>;
