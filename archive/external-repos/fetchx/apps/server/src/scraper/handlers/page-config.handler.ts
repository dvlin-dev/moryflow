/**
 * [INPUT]: Page, ScrapeOptions - Browser page and device/viewport config
 * [OUTPUT]: void - Configures page viewport, user agent, headers
 * [POS]: Page configuration handler for device emulation and headers
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import type { Page } from 'playwright';
import { DEVICE_PRESETS, type ScrapeOptions } from '../dto/scrape.dto';

interface ViewportConfig {
  width: number;
  height: number;
  userAgent?: string;
}

@Injectable()
export class PageConfigHandler {
  /**
   * 解析视口配置（消除 device/mobile/viewport 的冗余逻辑）
   */
  resolveViewport(options: ScrapeOptions): ViewportConfig {
    // 优先级：device > mobile > viewport > 默认
    if (options.device && DEVICE_PRESETS[options.device]) {
      const preset = DEVICE_PRESETS[options.device];
      return {
        width: preset.width,
        height: preset.height,
        userAgent: 'userAgent' in preset ? preset.userAgent : undefined,
      };
    }

    if (options.mobile) {
      return DEVICE_PRESETS.mobile;
    }

    return {
      width: options.viewport?.width || 1280,
      height: options.viewport?.height || 800,
    };
  }

  /**
   * 配置页面（视口、UA、深色模式）
   */
  async configure(page: Page, options: ScrapeOptions): Promise<void> {
    // 1. 设置自定义请求头
    if (options.headers) {
      await page.setExtraHTTPHeaders(options.headers as Record<string, string>);
    }

    // 2. 设置视口
    const viewportConfig = this.resolveViewport(options);
    await page.setViewportSize({
      width: viewportConfig.width,
      height: viewportConfig.height,
    });

    // 3. 设置 User-Agent（如果有设备预设）
    if (viewportConfig.userAgent) {
      await page.setExtraHTTPHeaders({ 'User-Agent': viewportConfig.userAgent });
    }

    // 4. 深色模式
    if (options.darkMode) {
      await page.emulateMedia({ colorScheme: 'dark' });
    }
  }
}
