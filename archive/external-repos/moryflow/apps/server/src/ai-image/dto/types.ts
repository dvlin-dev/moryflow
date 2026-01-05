/**
 * 图片生成 API 类型定义
 * 导出所有 Zod Schema 推断的类型
 */

import { z } from 'zod';
import { ImageGenerationRequestSchema, ImageSizeSchema } from './schemas';

// ==================== 请求类型 ====================

/** 图片生成请求 */
export type ImageGenerationRequest = z.infer<
  typeof ImageGenerationRequestSchema
>;

/** 图片尺寸 */
export type ImageSize = z.infer<typeof ImageSizeSchema>;

// ==================== 响应类型 ====================

/** 单张图片数据 */
export interface ImageData {
  /** 图片 URL（hosted） */
  url?: string;
  /** Base64 编码（inline） */
  b64_json?: string;
  /** 优化后的 prompt */
  revised_prompt?: string;
}

/** 图片生成响应 */
export interface ImageGenerationResponse {
  /** Unix 时间戳 */
  created: number;
  /** 图片数据列表 */
  data: ImageData[];
}

// ==================== Provider 类型 ====================

/** Provider 配置 */
export interface ImageProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

/** 图片生成选项 */
export interface ImageGenerationOptions {
  /** 模型 ID */
  model?: string;
  /** 生成提示词 */
  prompt: string;
  /** 生成数量 */
  n?: number;
  /** 尺寸 */
  size?: string | { width: number; height: number };
  /** 质量 */
  quality?: string;
  /** Provider 特定参数 */
  [key: string]: unknown;
}

/** 图片生成结果 */
export interface ImageGenerationResult {
  /** 生成的图片 */
  images: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  /** 用于计费的使用量 */
  usage?: {
    /** 图片生成 token（OpenRouter） */
    imageTokens?: number;
    /** 图片数量（通用计费） */
    imageCount?: number;
  };
}

// ==================== 内部类型 ====================

/** 图片生成用量（内部格式） */
export interface ImageUsage {
  imageCount: number;
  imageTokens?: number;
}

// ==================== Re-export ====================

export type { UserTier } from '../../types';
