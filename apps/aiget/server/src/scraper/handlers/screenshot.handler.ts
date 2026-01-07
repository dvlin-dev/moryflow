/**
 * [INPUT]: Page, ScreenshotOptions - Browser page and capture settings
 * [OUTPUT]: ScreenshotResult - URL, format, dimensions
 * [POS]: Screenshot capture with format conversion and R2 storage
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import type { Page } from 'playwright';
import { ImageProcessor } from './image-processor';
import { R2Service } from '../../storage/r2.service';
import { ScrapeErrorCode } from '../../common/constants/error-codes';
import {
  generateFilePath,
  calculateFileExpiresAt,
  R2_SCRAPER_USER_ID,
  R2_SCRAPER_VAULT_ID,
  type ImageFormat,
} from '../scraper.constants';
import type { ScrapeOptions, ScreenshotOptions } from '../dto/scrape.dto';
import type { ScreenshotResult } from '../scraper.types';

const DEFAULT_SCREENSHOT_OPTIONS: ScreenshotOptions = {
  fullPage: false,
  format: 'png',
  quality: 80,
  response: 'url',
};

interface CaptureResult {
  buffer: Buffer;
  width: number;
  height: number;
}

export interface ScreenshotHandlerResult extends ScreenshotResult {
  imageProcessMs: number;
  uploadMs?: number;
}

@Injectable()
export class ScreenshotHandler {
  constructor(
    private imageProcessor: ImageProcessor,
    private r2Service: R2Service,
  ) {}

  async process(
    page: Page,
    jobId: string,
    options: ScrapeOptions,
    tier: string,
  ): Promise<ScreenshotHandlerResult> {
    const screenshotOptions = {
      ...DEFAULT_SCREENSHOT_OPTIONS,
      ...options.screenshotOptions,
    };
    const format = screenshotOptions.format as ImageFormat;
    const quality = screenshotOptions.quality;
    const responseType = screenshotOptions.response;

    // 1. 执行截图
    const { buffer, width, height } = await this.captureScreenshot(
      page,
      screenshotOptions,
    );

    // 2. 图片处理
    const imageProcessStart = Date.now();
    const needWatermark = tier === 'FREE';
    const processResult = await this.imageProcessor.process(buffer, {
      format,
      quality,
      addWatermark: needWatermark,
    });
    const imageProcessMs = Date.now() - imageProcessStart;

    // 3. 根据 response 类型返回
    if (responseType === 'base64') {
      return {
        base64: processResult.buffer.toString('base64'),
        width,
        height,
        format,
        fileSize: processResult.fileSize,
        imageProcessMs,
      };
    }

    // 4. 上传到 R2
    const uploadStart = Date.now();
    const filePath = generateFilePath(jobId, format);
    const contentType = `image/${format === 'jpeg' ? 'jpeg' : format}`;

    try {
      await this.r2Service.uploadFile(
        R2_SCRAPER_USER_ID,
        R2_SCRAPER_VAULT_ID,
        filePath,
        processResult.buffer,
        contentType,
      );
    } catch (error) {
      const uploadError = new Error(
        `Screenshot upload failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      (uploadError as Error & { code: ScrapeErrorCode }).code =
        ScrapeErrorCode.STORAGE_ERROR;
      throw uploadError;
    }
    const uploadMs = Date.now() - uploadStart;

    // 5. 生成 CDN URL 和过期时间
    const fileUrl = this.r2Service.getPublicUrl(
      R2_SCRAPER_USER_ID,
      R2_SCRAPER_VAULT_ID,
      filePath,
    );
    const expiresAt = calculateFileExpiresAt(tier);

    return {
      url: fileUrl,
      width,
      height,
      format,
      fileSize: processResult.fileSize,
      expiresAt,
      imageProcessMs,
      uploadMs,
    };
  }

  private async captureScreenshot(
    page: Page,
    options: { clip?: string; fullPage?: boolean; format?: string },
  ): Promise<CaptureResult> {
    const format = options.format || 'png';

    if (options.clip) {
      const element = await page.$(options.clip);
      if (!element) {
        const error = new Error(`Selector not found: ${options.clip}`);
        (error as Error & { code: ScrapeErrorCode }).code =
          ScrapeErrorCode.SELECTOR_NOT_FOUND;
        throw error;
      }

      const buffer = await element.screenshot({
        type: format === 'jpeg' ? 'jpeg' : 'png',
      });
      const box = await element.boundingBox();

      return {
        buffer,
        width: Math.round(box?.width || 0),
        height: Math.round(box?.height || 0),
      };
    }

    const buffer = await page.screenshot({
      type: format === 'jpeg' ? 'jpeg' : 'png',
      fullPage: options.fullPage || false,
    });

    const viewportSize = page.viewportSize();
    const width = viewportSize?.width || 1280;
    const height = options.fullPage
      ? await page.evaluate(() => document.body.scrollHeight)
      : viewportSize?.height || 800;

    return { buffer, width, height };
  }
}
