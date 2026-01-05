/**
 * [INPUT]: Page, Action[] - Browser page and action sequence
 * [OUTPUT]: void - Executes actions on page (click, scroll, type, wait)
 * [POS]: Browser automation for dynamic content interaction
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import type { Page } from 'playwright';
import type { Action } from '../dto/scrape.dto';

@Injectable()
export class ActionExecutorHandler {
  async execute(page: Page, actions: Action[]): Promise<void> {
    for (const action of actions) {
      await this.executeAction(page, action);
    }
  }

  private async executeAction(page: Page, action: Action): Promise<void> {
    switch (action.type) {
      case 'click':
        if (!action.selector) throw new Error('click action requires selector');
        await page.click(action.selector);
        break;

      case 'type':
        if (!action.selector || !action.text) {
          throw new Error('type action requires selector and text');
        }
        await page.fill(action.selector, action.text);
        break;

      case 'scroll':
        if (action.selector) {
          // 滚动到元素
          await page.locator(action.selector).scrollIntoViewIfNeeded();
        } else {
          // 滚动页面
          const amount = action.amount || 500;
          const direction = action.direction === 'up' ? -amount : amount;
          await page.evaluate((scrollAmount) => {
            window.scrollBy(0, scrollAmount);
          }, direction);
        }
        break;

      case 'wait':
        if (action.selector) {
          await page.waitForSelector(action.selector);
        } else if (action.milliseconds) {
          await page.waitForTimeout(action.milliseconds);
        }
        break;

      case 'press':
        if (!action.key) throw new Error('press action requires key');
        await page.keyboard.press(action.key);
        break;

      case 'screenshot':
        // 截图操作在主流程中处理
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    // 每个操作后短暂等待，确保页面稳定
    await page.waitForTimeout(100);
  }
}
