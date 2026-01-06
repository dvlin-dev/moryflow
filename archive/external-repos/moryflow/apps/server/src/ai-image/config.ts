/**
 * 图片生成模型配置（硬编码）
 * 定义支持的图片生成模型及其价格
 */

import type { UserTier } from '../types';

/** 图片生成 SDK 类型 */
export type ImageSdkType = 'fal' | 'openrouter';

/** 图片模型配置 */
export interface ImageModelConfig {
  /** 对外模型 ID */
  modelId: string;
  /** 显示名称 */
  displayName: string;
  /** SDK 类型 */
  sdkType: ImageSdkType;
  /** 上游模型 ID（调用 API 时使用） */
  upstreamId: string;
  /** 图片价格（美元/张） */
  imagePrice: number;
  /** 最低用户等级 */
  minTier: UserTier;
  /** 是否启用 */
  enabled: boolean;
}

/** 默认图片模型 ID */
export const DEFAULT_IMAGE_MODEL = 'z-image-turbo';

/**
 * 图片生成模型配置列表
 * 支持：Fal.ai、OpenRouter (Gemini)
 */
export const IMAGE_MODELS: ImageModelConfig[] = [
  // 默认模型 - 超快速、高性价比
  {
    modelId: 'z-image-turbo',
    displayName: 'Z-Image Turbo',
    sdkType: 'fal',
    upstreamId: 'fal-ai/z-image/turbo',
    imagePrice: 0.005, // $0.005/megapixel，按 1MP 估算
    minTier: 'free',
    enabled: true,
  },
  {
    modelId: 'gpt-image-1.5',
    displayName: 'GPT Image 1.5',
    sdkType: 'fal',
    upstreamId: 'fal-ai/gpt-image-1.5',
    imagePrice: 0.08,
    minTier: 'free',
    enabled: true,
  },
  {
    modelId: 'seedream-4.5',
    displayName: 'Seedream 4.5',
    sdkType: 'fal',
    upstreamId: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    imagePrice: 0.04,
    minTier: 'free',
    enabled: true,
  },
  {
    modelId: 'gemini-3-pro-image',
    displayName: 'Gemini 3 Pro Image',
    sdkType: 'openrouter',
    upstreamId: 'google/gemini-3-pro-image-preview',
    imagePrice: 0.04,
    minTier: 'free',
    enabled: true,
  },
];

/** 模型 ID 到配置的映射 */
const MODEL_MAP = new Map<string, ImageModelConfig>(
  IMAGE_MODELS.map((m) => [m.modelId, m]),
);

/**
 * 根据模型 ID 获取配置
 */
export function getImageModelConfig(
  modelId: string,
): ImageModelConfig | undefined {
  return MODEL_MAP.get(modelId);
}

/**
 * 获取所有启用的图片模型
 */
export function getEnabledImageModels(): ImageModelConfig[] {
  return IMAGE_MODELS.filter((m) => m.enabled);
}
