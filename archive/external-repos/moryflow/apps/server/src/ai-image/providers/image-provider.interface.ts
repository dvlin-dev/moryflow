/**
 * 图片生成 Provider 接口定义
 * 所有 Provider 适配器必须实现此接口
 */

import type { ImageGenerationOptions, ImageGenerationResult } from '../dto';

/**
 * 图片生成 Provider 接口
 * 适配器模式：统一不同 Provider 的调用方式
 */
export interface IImageProvider {
  /** Provider 标识 */
  readonly type: string;

  /**
   * 生成图片
   * @param options 生成选项
   * @returns 生成结果
   */
  generate(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
}
