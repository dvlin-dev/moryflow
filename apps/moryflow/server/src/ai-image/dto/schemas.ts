/**
 * 图片生成 API Zod Schemas
 * 定义请求验证的 Zod Schema
 */

import { z } from 'zod';

// ==================== 尺寸 Schema ====================

/** 自定义尺寸对象 */
const CustomSizeSchema = z.object({
  width: z.number().int().min(256).max(4096),
  height: z.number().int().min(256).max(4096),
});

/** 预设尺寸字符串 */
const PresetSizeSchema = z.enum([
  // OpenAI 预设
  '1024x1024',
  '1536x1024',
  '1024x1536',
  // Fal.ai 预设
  'square_hd',
  'portrait_4_3',
  'landscape_4_3',
  'auto_2K',
]);

/** 图片尺寸（字符串或自定义对象） */
export const ImageSizeSchema = z.union([PresetSizeSchema, CustomSizeSchema]);

// ==================== 请求 Schema ====================

/** 图片生成请求 Schema */
export const ImageGenerationRequestSchema = z
  .object({
    // 模型（可选，不传则使用默认模型）
    model: z.string().min(1).optional(),
    prompt: z.string().min(1, 'prompt is required').max(32000),

    // 通用可选参数
    n: z.number().int().min(1).max(10).optional(),
    size: ImageSizeSchema.optional(),
    quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),

    // gpt-image-1.5 参数 (Fal.ai)
    background: z.enum(['transparent', 'opaque', 'auto']).optional(),
    output_format: z.enum(['png', 'jpeg', 'webp']).optional(),

    // seedream 参数 (Fal.ai)
    seed: z.number().int().optional(),
    enable_safety_checker: z.boolean().optional(),

    // 用户信息
    user: z.string().optional(),
  })
  .passthrough(); // 允许额外字段透传
