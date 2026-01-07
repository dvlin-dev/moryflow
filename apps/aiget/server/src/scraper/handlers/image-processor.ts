/**
 * [INPUT]: Buffer, ProcessOptions - Raw image and processing config
 * [OUTPUT]: ProcessResult - Processed image with format/quality/watermark
 * [POS]: Image post-processing with Sharp (format, quality, watermark)
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import type {
  ImageFormat,
  ProcessOptions,
  ProcessResult,
} from '../scraper.constants';
import {
  FREE_TIER_WATERMARK,
  WATERMARK_FONT_SIZE,
  WATERMARK_PADDING,
} from '../scraper.constants';

@Injectable()
export class ImageProcessor {
  private readonly logger = new Logger(ImageProcessor.name);

  /**
   * 处理图片
   */
  async process(
    input: Buffer,
    options: ProcessOptions,
  ): Promise<ProcessResult> {
    const startTime = Date.now();
    let pipeline = sharp(input);

    // 获取原始图片信息
    const metadata = await pipeline.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // 添加水印（免费版）
    if (options.addWatermark) {
      pipeline = this.addWatermark(pipeline, width, height);
    }

    // 格式转换和质量压缩
    pipeline = this.applyFormat(pipeline, options.format, options.quality);

    // 输出
    const buffer = await pipeline.toBuffer();
    const processingMs = Date.now() - startTime;

    return {
      buffer,
      fileSize: buffer.length,
      width,
      height,
      processingMs,
    };
  }

  /**
   * 添加水印
   */
  private addWatermark(
    pipeline: sharp.Sharp,
    width: number,
    height: number,
  ): sharp.Sharp {
    try {
      // 创建水印 SVG
      const watermarkSvg = this.createWatermarkSvg(width);

      // 计算水印位置（右下角）
      const x = Math.max(
        0,
        width - this.getWatermarkWidth() - WATERMARK_PADDING,
      );
      const y = Math.max(0, height - WATERMARK_FONT_SIZE - WATERMARK_PADDING);

      // 合成水印
      return pipeline.composite([
        {
          input: Buffer.from(watermarkSvg),
          left: Math.round(x),
          top: Math.round(y),
        },
      ]);
    } catch (error) {
      this.logger.warn(`Failed to add watermark: ${error}`);
      return pipeline;
    }
  }

  /**
   * 创建水印 SVG
   */
  private createWatermarkSvg(imageWidth: number): string {
    const text = FREE_TIER_WATERMARK;
    const fontSize = WATERMARK_FONT_SIZE;
    const textWidth = this.getWatermarkWidth();
    const textHeight = fontSize + 4;

    // 根据图片宽度调整透明度
    const opacity = imageWidth > 800 ? 0.5 : 0.7;

    return `
      <svg width="${textWidth}" height="${textHeight}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .watermark {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: ${fontSize}px;
            font-weight: 500;
            fill: rgba(255, 255, 255, ${opacity});
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          }
        </style>
        <text x="0" y="${fontSize}" class="watermark">${text}</text>
      </svg>
    `;
  }

  /**
   * 获取水印宽度（估算）
   */
  private getWatermarkWidth(): number {
    // 估算：每个字符约 8px
    return FREE_TIER_WATERMARK.length * 8 + 10;
  }

  /**
   * 应用输出格式
   */
  private applyFormat(
    pipeline: sharp.Sharp,
    format: ImageFormat,
    quality: number,
  ): sharp.Sharp {
    switch (format) {
      case 'png':
        // PNG 无损格式：quality 映射到 compressionLevel
        return pipeline.png({
          compressionLevel:
            quality === 100 ? 0 : Math.round((100 - quality) / 11),
        });

      case 'jpeg':
        return pipeline.jpeg({
          quality,
          progressive: true,
        });

      case 'webp':
        return pipeline.webp({
          quality,
        });

      default:
        return pipeline.png({
          compressionLevel: 0,
        });
    }
  }

  /**
   * 仅转换格式（不添加水印）
   */
  async convert(
    input: Buffer,
    format: ImageFormat,
    quality: number,
  ): Promise<Buffer> {
    let pipeline = sharp(input);
    pipeline = this.applyFormat(pipeline, format, quality);
    return pipeline.toBuffer();
  }

  /**
   * 获取图片信息
   */
  async getInfo(
    input: Buffer,
  ): Promise<{ width: number; height: number; format: string }> {
    const metadata = await sharp(input).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    };
  }
}
