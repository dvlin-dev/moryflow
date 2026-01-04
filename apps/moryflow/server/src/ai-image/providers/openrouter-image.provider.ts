/**
 * OpenRouter 图片生成 Provider
 * 适配 OpenRouter API (通过 Chat Completions + modalities 生成图片)
 * 支持 Google Gemini 等多模态模型
 */

import OpenAI from 'openai';
import type { IImageProvider } from './image-provider.interface';
import type {
  ImageProviderConfig,
  ImageGenerationOptions,
  ImageGenerationResult,
} from '../dto';

/** OpenRouter 消息中的图片格式 */
interface OpenRouterImage {
  type?: 'image_url';
  image_url?: {
    url: string;
  };
}

/** 扩展的 OpenRouter 消息类型 */
interface OpenRouterMessage {
  role: string;
  content: string | null;
  images?: OpenRouterImage[];
}

/**
 * OpenRouter 图片生成 Provider
 * 通过 Chat Completions API + modalities 实现图片生成
 */
export class OpenRouterImageProvider implements IImageProvider {
  readonly type = 'openrouter';
  private client: OpenAI;

  constructor(config: ImageProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl ?? 'https://openrouter.ai/api/v1',
    });
  }

  /**
   * 生成图片
   */
  async generate(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    const modelId = options.model ?? 'google/gemini-3-pro-image-preview';

    // OpenRouter 通过 Chat Completions API + modalities 生成图片
    const response = await this.client.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
      // @ts-expect-error modalities 是 OpenRouter 扩展字段
      modalities: ['image', 'text'],
    });

    const message = response.choices[0]?.message as
      | OpenRouterMessage
      | undefined;
    const images: Array<{ url?: string; b64_json?: string }> = [];

    // 从 message.images 提取图片
    if (message && 'images' in message && Array.isArray(message.images)) {
      for (const img of message.images) {
        if (img.image_url?.url) {
          // OpenRouter 返回 data URI 格式
          const dataUri = img.image_url.url;
          if (dataUri.startsWith('data:image')) {
            const base64 = dataUri.split(',')[1];
            images.push({ b64_json: base64 });
          } else {
            images.push({ url: dataUri });
          }
        }
      }
    }

    return {
      images,
      usage: {
        imageCount: images.length,
        imageTokens: response.usage?.completion_tokens,
      },
    };
  }
}
