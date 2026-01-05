/**
 * 图片生成模型配置常量
 * 与后端 config.ts 保持一致
 */

/** 图片生成模型 */
export interface ImageModel {
  id: string;
  name: string;
  provider: 'fal' | 'openrouter';
  /** 支持的专属参数 */
  params: ('background' | 'output_format' | 'seed' | 'enable_safety_checker')[];
}

/** 可用的图片生成模型 */
export const IMAGE_MODELS: ImageModel[] = [
  {
    id: 'z-image-turbo',
    name: 'Z-Image Turbo',
    provider: 'fal',
    params: ['seed', 'enable_safety_checker', 'output_format'],
  },
  {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    provider: 'fal',
    params: ['background', 'output_format'],
  },
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    provider: 'fal',
    params: ['seed', 'enable_safety_checker'],
  },
  {
    id: 'gemini-3-pro-image',
    name: 'Gemini 3 Pro Image',
    provider: 'openrouter',
    params: [],
  },
];

/** 图片尺寸预设 */
export const IMAGE_SIZES = [
  { value: '1024x1024', label: '1024x1024 (正方形)' },
  { value: '1536x1024', label: '1536x1024 (横向)' },
  { value: '1024x1536', label: '1024x1536 (纵向)' },
];

/** 图片质量选项 */
export const IMAGE_QUALITIES = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'auto', label: '自动' },
];

/** 背景选项 (gpt-image-1.5) */
export const BACKGROUND_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'transparent', label: '透明' },
  { value: 'opaque', label: '不透明' },
];

/** 输出格式选项 (gpt-image-1.5) */
export const OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
];
