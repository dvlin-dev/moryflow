/**
 * Fal.ai 图片生成 Provider
 * 适配 Fal.ai API (z-image-turbo, gpt-image-1.5, seedream-4.5)
 */

import { fal } from '@fal-ai/client';
import type { IImageProvider } from './image-provider.interface';
import type {
  ImageProviderConfig,
  ImageGenerationOptions,
  ImageGenerationResult,
} from '../dto';

/** Fal.ai 响应类型 */
interface FalImageResponse {
  images: Array<{
    url: string;
    width?: number;
    height?: number;
    content_type?: string;
  }>;
}

/**
 * Fal.ai 图片生成 Provider
 * 支持 z-image-turbo, gpt-image-1.5, seedream-4.5 等模型
 */
export class FalImageProvider implements IImageProvider {
  readonly type = 'fal';

  constructor(config: ImageProviderConfig) {
    fal.config({ credentials: config.apiKey });
  }

  /**
   * 生成图片
   */
  async generate(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    // model 由 Service 层保证传递，此处不设默认值
    const modelId = options.model!;

    // 根据模型构建不同的输入参数
    const input = this.buildInput(modelId, options);

    const result = await fal.subscribe(modelId, { input });
    const data = result.data as FalImageResponse;

    return {
      images: data.images.map((img) => ({
        url: img.url,
      })),
      usage: {
        imageCount: data.images.length,
      },
    };
  }

  /**
   * 根据模型构建输入参数
   * 不同模型支持不同的参数
   */
  private buildInput(
    modelId: string,
    options: ImageGenerationOptions,
  ): Record<string, unknown> {
    // gpt-image-1.5 特殊处理
    if (modelId.includes('gpt-image')) {
      return {
        prompt: options.prompt,
        num_images: Math.min(options.n ?? 1, 4),
        image_size: options.size ?? '1024x1024',
        quality: options.quality ?? 'high',
        background: options.background as string | undefined,
        output_format: options.output_format as string | undefined,
      };
    }

    // z-image-turbo / seedream 通用参数
    return {
      prompt: options.prompt,
      num_images: Math.min(options.n ?? 1, 6),
      image_size: this.normalizeSize(options.size),
      seed: options.seed as number | undefined,
      enable_safety_checker:
        (options.enable_safety_checker as boolean) ?? false,
      output_format: options.output_format as string | undefined,
    };
  }

  /**
   * 尺寸归一化
   * 将 OpenAI 格式转换为 Fal.ai 预设
   */
  private normalizeSize(
    size?: string | { width: number; height: number },
  ): string | { width: number; height: number } {
    if (!size) return 'landscape_4_3';

    if (typeof size === 'string') {
      // OpenAI 格式映射到 Fal 预设
      const sizeMap: Record<string, string> = {
        '1024x1024': 'square_hd',
        '1536x1024': 'landscape_4_3',
        '1024x1536': 'portrait_4_3',
      };
      return sizeMap[size] ?? size;
    }

    return { width: size.width, height: size.height };
  }
}
