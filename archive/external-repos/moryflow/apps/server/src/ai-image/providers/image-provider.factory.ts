/**
 * 图片生成 Provider 工厂
 * 根据 Provider 类型创建对应的适配器实例
 */

import type { IImageProvider } from './image-provider.interface';
import type { ImageProviderConfig } from '../dto';
import type { ImageModelConfig, ImageSdkType } from '../config';
import { FalImageProvider } from './fal-image.provider';
import { OpenRouterImageProvider } from './openrouter-image.provider';
import { UnsupportedProviderException } from '../exceptions';

/** 环境变量配置 */
const ENV_CONFIG: Record<
  ImageSdkType,
  { apiKeyEnv: string; baseUrlEnv?: string }
> = {
  fal: {
    apiKeyEnv: 'FAL_API_KEY',
  },
  openrouter: {
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseUrlEnv: 'OPENROUTER_BASE_URL',
  },
};

/**
 * 图片生成 Provider 工厂
 * 负责根据配置创建对应的 Provider 实例
 */
export class ImageProviderFactory {
  /**
   * 从硬编码模型配置创建 Provider
   * API Key 从环境变量读取
   */
  static createFromConfig(modelConfig: ImageModelConfig): IImageProvider {
    const envConfig = ENV_CONFIG[modelConfig.sdkType];
    if (!envConfig) {
      throw new UnsupportedProviderException(modelConfig.sdkType);
    }

    const config: ImageProviderConfig = {
      apiKey: process.env[envConfig.apiKeyEnv] ?? '',
      baseUrl: envConfig.baseUrlEnv
        ? process.env[envConfig.baseUrlEnv]
        : undefined,
    };

    return this.createByType(modelConfig.sdkType, config);
  }

  /**
   * 根据 SDK 类型创建 Provider
   */
  private static createByType(
    sdkType: ImageSdkType,
    config: ImageProviderConfig,
  ): IImageProvider {
    switch (sdkType) {
      case 'fal':
        return new FalImageProvider(config);
      case 'openrouter':
        return new OpenRouterImageProvider(config);
      default:
        throw new UnsupportedProviderException(sdkType);
    }
  }
}
