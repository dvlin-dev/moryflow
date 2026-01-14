/**
 * Action Handler
 *
 * [INPUT]: BrowserSession + ActionInput
 * [OUTPUT]: ActionResponse
 * [POS]: 执行浏览器操作，支持 @ref 语法
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Locator, Page } from 'playwright';
import { SessionManager, type BrowserSession } from '../session';
import type { ActionInput, ActionResponse } from '../dto';

@Injectable()
export class ActionHandler {
  private readonly logger = new Logger(ActionHandler.name);

  constructor(private readonly sessionManager: SessionManager) {}

  /**
   * 执行动作
   */
  async execute(
    session: BrowserSession,
    action: ActionInput,
  ): Promise<ActionResponse> {
    const { type, selector, timeout = 5000 } = action;

    try {
      // 解析选择器（如果需要）
      let locator: Locator | undefined;
      if (selector) {
        locator = this.sessionManager.resolveSelector(session, selector);
      }

      // 根据动作类型执行
      switch (type) {
        // ===== 导航 =====
        case 'back':
          await session.page.goBack({ timeout });
          return { success: true };

        case 'forward':
          await session.page.goForward({ timeout });
          return { success: true };

        case 'reload':
          await session.page.reload({ timeout });
          return { success: true };

        // ===== 交互 =====
        case 'click':
          return await this.handleClick(locator!, action);

        case 'dblclick':
          await locator!.dblclick({ timeout });
          return { success: true };

        case 'fill':
          if (!action.value) {
            throw new Error('fill requires a value');
          }
          await locator!.fill(action.value, { timeout });
          return { success: true };

        case 'type':
          if (!action.value) {
            throw new Error('type requires a value');
          }
          await locator!.pressSequentially(action.value, {
            delay: 50,
            timeout,
          });
          return { success: true };

        case 'press':
          if (!action.key) {
            throw new Error('press requires a key');
          }
          if (locator) {
            await locator.press(action.key, { timeout });
          } else {
            await session.page.keyboard.press(action.key);
          }
          return { success: true };

        case 'hover':
          await locator!.hover({ timeout });
          return { success: true };

        case 'focus':
          await locator!.focus({ timeout });
          return { success: true };

        case 'blur':
          await locator!.blur({ timeout });
          return { success: true };

        case 'check':
          await locator!.check({ timeout });
          return { success: true };

        case 'uncheck':
          await locator!.uncheck({ timeout });
          return { success: true };

        case 'selectOption':
          if (!action.options || action.options.length === 0) {
            throw new Error('selectOption requires options');
          }
          await locator!.selectOption(action.options, { timeout });
          return { success: true };

        // ===== 滚动 =====
        case 'scroll':
          return await this.handleScroll(session.page, action);

        case 'scrollIntoView':
          await locator!.scrollIntoViewIfNeeded({ timeout });
          return { success: true };

        // ===== 等待 =====
        case 'wait':
          return await this.handleWait(session, action);

        // ===== 信息获取 =====
        case 'getText': {
          const text = await locator!.textContent({ timeout });
          return { success: true, result: text };
        }

        case 'getInnerHTML': {
          const html = await locator!.innerHTML({ timeout });
          return { success: true, result: html };
        }

        case 'getAttribute': {
          if (!action.attribute) {
            throw new Error('getAttribute requires an attribute name');
          }
          const attr = await locator!.getAttribute(action.attribute, {
            timeout,
          });
          return { success: true, result: attr };
        }

        case 'getInputValue': {
          const value = await locator!.inputValue({ timeout });
          return { success: true, result: value };
        }

        // ===== 状态检查 =====
        case 'isVisible': {
          const visible = await locator!.isVisible();
          return { success: true, result: visible };
        }

        case 'isEnabled': {
          const enabled = await locator!.isEnabled();
          return { success: true, result: enabled };
        }

        case 'isChecked': {
          const checked = await locator!.isChecked();
          return { success: true, result: checked };
        }

        default: {
          const actionType = String(type);
          throw new Error(`Unknown action type: ${actionType}`);
        }
      }
    } catch (error) {
      return this.toAIFriendlyError(error, selector);
    }
  }

  /**
   * 处理点击操作
   */
  private async handleClick(
    locator: Locator,
    action: ActionInput,
  ): Promise<ActionResponse> {
    const { clickOptions, timeout = 5000 } = action;

    await locator.click({
      button: clickOptions?.button ?? 'left',
      clickCount: clickOptions?.clickCount ?? 1,
      modifiers: clickOptions?.modifiers,
      timeout,
    });

    return { success: true };
  }

  /**
   * 处理滚动操作
   */
  private async handleScroll(
    page: Page,
    action: ActionInput,
  ): Promise<ActionResponse> {
    const { direction = 'down', distance = 300 } = action;

    let deltaX = 0;
    let deltaY = 0;

    switch (direction) {
      case 'up':
        deltaY = -distance;
        break;
      case 'down':
        deltaY = distance;
        break;
      case 'left':
        deltaX = -distance;
        break;
      case 'right':
        deltaX = distance;
        break;
    }

    await page.mouse.wheel(deltaX, deltaY);
    return { success: true };
  }

  /**
   * 处理等待操作
   */
  private async handleWait(
    session: BrowserSession,
    action: ActionInput,
  ): Promise<ActionResponse> {
    const { waitFor, timeout = 5000 } = action;

    if (!waitFor) {
      throw new Error('wait requires a waitFor condition');
    }

    if (waitFor.time !== undefined) {
      await session.page.waitForTimeout(waitFor.time);
      return { success: true };
    }

    if (waitFor.selector) {
      await session.page.waitForSelector(waitFor.selector, {
        state: 'visible',
        timeout,
      });
      return { success: true };
    }

    if (waitFor.selectorGone) {
      await session.page.waitForSelector(waitFor.selectorGone, {
        state: 'hidden',
        timeout,
      });
      return { success: true };
    }

    if (waitFor.url) {
      await session.page.waitForURL(waitFor.url, { timeout });
      return { success: true };
    }

    if (waitFor.text) {
      await session.page.waitForFunction(
        (text) => document.body.textContent?.includes(text),
        waitFor.text,
        { timeout },
      );
      return { success: true };
    }

    if (waitFor.networkIdle) {
      await session.page.waitForLoadState('networkidle', { timeout });
      return { success: true };
    }

    throw new Error('wait requires at least one condition');
  }

  /**
   * 转换为 AI 友好的错误消息
   */
  private toAIFriendlyError(error: unknown, selector?: string): ActionResponse {
    const message = error instanceof Error ? error.message : String(error);

    // 严格模式违规（多个元素匹配）
    if (message.includes('strict mode violation')) {
      const count =
        message.match(/resolved to (\d+) elements/)?.[1] ?? 'multiple';
      return {
        success: false,
        error: `Selector matched ${count} elements instead of one.`,
        suggestion: `Run 'snapshot' to get updated refs, or use a more specific CSS selector.`,
      };
    }

    // 元素不可交互（被遮挡）
    if (message.includes('intercepts pointer events')) {
      return {
        success: false,
        error: `Element is not interactable (may be hidden or covered).`,
        suggestion: `Try scrolling the element into view or check if a modal/overlay is blocking it.`,
      };
    }

    // 元素未找到
    if (
      message.includes('waiting for locator') ||
      message.includes('Timeout')
    ) {
      return {
        success: false,
        error: `Element not found: ${selector ?? 'unknown'}`,
        suggestion: `Run 'snapshot' to verify the element exists and get its current ref.`,
      };
    }

    // 未知 ref
    if (message.includes('Unknown ref:')) {
      return {
        success: false,
        error: message,
        suggestion: `Run 'snapshot' to get the current refs. Refs may change after page interactions.`,
      };
    }

    // 默认错误
    return {
      success: false,
      error: message,
    };
  }
}
