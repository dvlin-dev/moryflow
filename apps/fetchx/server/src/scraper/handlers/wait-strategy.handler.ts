/**
 * [INPUT]: Page, ScrapeOptions - Browser page and wait configuration
 * [OUTPUT]: void - Waits for page readiness based on strategy
 * [POS]: Dynamic content wait strategies (network idle, selectors, spinners)
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import type { Page } from 'playwright';
import type { ScrapeOptions } from '../dto/scrape.dto';

@Injectable()
export class WaitStrategyHandler {
  // 常见的 loading 指示器选择器
  private readonly LOADING_SELECTORS = [
    '[class*="loading"]',
    '[class*="spinner"]',
    '[class*="skeleton"]',
    '[aria-busy="true"]',
    '.ant-spin-spinning',
    '.el-loading-mask',
    '.chakra-spinner',
    '[data-loading="true"]',
  ];

  /**
   * 智能等待页面就绪
   */
  async waitForPageReady(page: Page, options: ScrapeOptions): Promise<void> {
    if (typeof options.waitFor === 'number') {
      // 固定等待时间
      await page.waitForTimeout(options.waitFor);
    } else if (typeof options.waitFor === 'string') {
      // 等待特定选择器
      await page.waitForSelector(options.waitFor, { timeout: 10000 });
    } else {
      // 智能等待
      await this.smartWait(page);
    }
  }

  /**
   * 智能等待：网络空闲 + loading 消失
   */
  private async smartWait(page: Page): Promise<void> {
    // 1. 等待网络空闲（最多 10 秒）
    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(() => {});

    // 2. 等待 loading 指示器消失（最多 3 秒）
    await page.evaluate((selectors) => {
      return new Promise<void>((resolve) => {
        const checkLoading = () => {
          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && (el as HTMLElement).offsetParent !== null) {
              return false; // 还在 loading
            }
          }
          return true; // loading 完成
        };

        const waitLoop = () => {
          if (checkLoading()) {
            resolve();
          } else {
            setTimeout(waitLoop, 100);
          }
        };

        // 最多等待 3 秒
        setTimeout(resolve, 3000);
        waitLoop();
      });
    }, this.LOADING_SELECTORS);
  }

  /**
   * 隐藏指定元素（用于截图时隐藏广告等）
   */
  async hideElements(page: Page, selectors: string[]): Promise<void> {
    if (!selectors.length) return;

    await page.evaluate((sels: string[]) => {
      sels.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });
    }, selectors);
  }
}
