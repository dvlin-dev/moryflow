/**
 * Action Handler
 *
 * [INPUT]: BrowserSession + ActionInput
 * [OUTPUT]: ActionResponse
 * [POS]: 执行浏览器操作，支持 @ref 语法与等待条件（含必要参数校验）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { mkdirSync, promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Locator, Page, Download } from 'playwright';
import { SessionManager, type BrowserSession } from '../session';
import type {
  ActionInput,
  ActionResponse,
  LocatorInput,
  LocatorSelectorInput,
} from '../dto';

@Injectable()
export class ActionHandler {
  private readonly logger = new Logger(ActionHandler.name);
  private readonly downloadDir = join(tmpdir(), 'anyhunt-browser-downloads');

  constructor(private readonly sessionManager: SessionManager) {}

  /**
   * 执行动作
   */
  async execute(
    session: BrowserSession,
    action: ActionInput,
  ): Promise<ActionResponse> {
    const { type, timeout = 5000 } = action;

    try {
      const requiresTarget = new Set<ActionInput['type']>([
        'click',
        'dblclick',
        'fill',
        'type',
        'hover',
        'focus',
        'blur',
        'check',
        'uncheck',
        'selectOption',
        'scrollIntoView',
        'upload',
        'highlight',
        'getText',
        'getInnerHTML',
        'getAttribute',
        'getInputValue',
        'getCount',
        'getBoundingBox',
        'isVisible',
        'isEnabled',
        'isChecked',
      ]);

      const locator = this.resolveActionLocator(session, action);
      if (requiresTarget.has(type) && !locator) {
        throw new Error(
          `selector or locator is required for action type ${type}`,
        );
      }

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
          if (action.value === undefined) {
            throw new Error('fill requires a value');
          }
          await locator!.fill(action.value, { timeout });
          return { success: true };

        case 'type':
          if (action.value === undefined) {
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

        case 'drag': {
          const source = this.resolveLocatorInput(session, action.source!);
          const target = this.resolveLocatorInput(session, action.target!);
          await source.dragTo(target, { timeout });
          return { success: true };
        }

        case 'upload': {
          if (!action.files) {
            throw new Error('upload requires files');
          }
          await locator!.setInputFiles(action.files);
          return { success: true };
        }

        case 'highlight':
          await this.highlightLocator(locator!);
          return { success: true };

        // ===== 滚动 =====
        case 'scroll':
          return await this.handleScroll(session.page, action, locator);

        case 'scrollIntoView':
          await locator!.scrollIntoViewIfNeeded({ timeout });
          return { success: true };

        // ===== 等待 =====
        case 'wait':
          return await this.handleWait(session, action);

        // ===== 脚本 / 内容 =====
        case 'evaluate': {
          if (!action.script) {
            throw new Error('evaluate requires script');
          }
          const result = await session.page.evaluate(action.script, action.arg);
          return { success: true, result };
        }

        case 'setContent': {
          if (!action.html) {
            throw new Error('setContent requires html');
          }
          await session.page.setContent(action.html, {
            waitUntil: 'domcontentloaded',
          });
          return { success: true };
        }

        case 'pdf': {
          const buffer = await session.page.pdf({
            format: action.pdfFormat ?? 'A4',
            printBackground: true,
          });
          return {
            success: true,
            result: {
              data: buffer.toString('base64'),
              mimeType: 'application/pdf',
              size: buffer.length,
            },
          };
        }

        case 'download':
          return await this.handleDownload(session, locator, action, timeout);

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

        case 'getCount': {
          const count = await locator!.count();
          return { success: true, result: count };
        }

        case 'getBoundingBox': {
          const box = await locator!.boundingBox();
          return { success: true, result: box };
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

        // ===== 运行时环境 =====
        case 'setViewport': {
          if (!action.viewport) {
            throw new Error('setViewport requires viewport');
          }
          await session.page.setViewportSize(action.viewport);
          return { success: true };
        }

        case 'setGeolocation': {
          if (!action.geolocation) {
            throw new Error('setGeolocation requires geolocation');
          }
          await session.context.setGeolocation(action.geolocation);
          return { success: true };
        }

        case 'setPermissions': {
          if (!action.permissions || action.permissions.length === 0) {
            throw new Error('setPermissions requires permissions');
          }
          await session.context.grantPermissions(action.permissions);
          return { success: true };
        }

        case 'clearPermissions': {
          await session.context.clearPermissions();
          return { success: true };
        }

        case 'setMedia': {
          await session.page.emulateMedia({
            colorScheme: action.colorScheme,
            reducedMotion: action.reducedMotion,
          });
          return { success: true };
        }

        case 'setOffline': {
          if (action.offline === undefined) {
            throw new Error('setOffline requires offline');
          }
          await session.context.setOffline(action.offline);
          return { success: true };
        }

        case 'setHeaders': {
          if (!action.headers) {
            throw new Error('setHeaders requires headers');
          }
          await session.context.setExtraHTTPHeaders(action.headers);
          return { success: true };
        }

        case 'setHttpCredentials': {
          if (!action.httpCredentials) {
            throw new Error('setHttpCredentials requires httpCredentials');
          }
          await session.context.setHTTPCredentials(action.httpCredentials);
          return { success: true };
        }

        default: {
          const actionType = String(type);
          throw new Error(`Unknown action type: ${actionType}`);
        }
      }
    } catch (error) {
      const selectorLabel =
        action.selector ??
        (action.locator ? this.describeLocator(action.locator) : undefined) ??
        (action.type === 'press' ? action.key : undefined);
      return this.toAIFriendlyError(error, selectorLabel);
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
    locator?: Locator,
  ): Promise<ActionResponse> {
    const { direction = 'down', distance = 300 } = action;

    if (locator) {
      await locator.evaluate(
        (element, payload: { direction: string; distance: number }) => {
          const { direction, distance } = payload;
          switch (direction) {
            case 'up':
              element.scrollBy(0, -distance);
              break;
            case 'down':
              element.scrollBy(0, distance);
              break;
            case 'left':
              element.scrollBy(-distance, 0);
              break;
            case 'right':
              element.scrollBy(distance, 0);
              break;
          }
        },
        { direction, distance },
      );
      return { success: true };
    }

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
      const locator = this.sessionManager.resolveSelector(
        session,
        waitFor.selector,
      );
      await locator.waitFor({ state: 'visible', timeout });
      return { success: true };
    }

    if (waitFor.selectorGone) {
      const locator = this.sessionManager.resolveSelector(
        session,
        waitFor.selectorGone,
      );
      await locator.waitFor({ state: 'hidden', timeout });
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

    if (waitFor.loadState) {
      await session.page.waitForLoadState(waitFor.loadState, { timeout });
      return { success: true };
    }

    if (waitFor.function) {
      await session.page.waitForFunction(waitFor.function, { timeout });
      return { success: true };
    }

    if (waitFor.download) {
      const download = await session.page.waitForEvent('download', { timeout });
      return {
        success: true,
        result: {
          url: download.url(),
          filename: download.suggestedFilename(),
        },
      };
    }

    throw new Error('wait requires at least one condition');
  }

  private resolveActionLocator(
    session: BrowserSession,
    action: ActionInput,
  ): Locator | undefined {
    if (action.locator) {
      return this.sessionManager.resolveLocator(session, action.locator);
    }
    if (action.selector) {
      return this.sessionManager.resolveSelector(session, action.selector);
    }
    return undefined;
  }

  private resolveLocatorInput(
    session: BrowserSession,
    input: LocatorSelectorInput,
  ): Locator {
    return this.sessionManager.resolveLocatorInput(session, input);
  }

  private async highlightLocator(locator: Locator): Promise<void> {
    await locator.evaluate((element) => {
      element.scrollIntoView({ block: 'center', inline: 'center' });
      const previous = (element as HTMLElement).style.outline;
      (element as HTMLElement).style.outline = '2px solid #ff7a00';
      setTimeout(() => {
        (element as HTMLElement).style.outline = previous;
      }, 1200);
    });
  }

  private async handleDownload(
    session: BrowserSession,
    locator: Locator | undefined,
    action: ActionInput,
    timeout: number,
  ): Promise<ActionResponse> {
    mkdirSync(this.downloadDir, { recursive: true });

    const downloadPromise = session.page.waitForEvent('download', { timeout });

    if (locator) {
      await locator.click({ timeout });
    }

    const download = await downloadPromise;
    const filePath = await this.saveDownload(download);

    if (action.storeDownload === false) {
      return {
        success: true,
        result: {
          url: download.url(),
          filename: download.suggestedFilename(),
        },
      };
    }

    const data = await fs.readFile(filePath);
    await fs.unlink(filePath).catch(() => undefined);

    return {
      success: true,
      result: {
        url: download.url(),
        filename: download.suggestedFilename(),
        data: data.toString('base64'),
        size: data.length,
      },
    };
  }

  private async saveDownload(download: Download): Promise<string> {
    const safeName = download.suggestedFilename().replace(/\\s+/g, '_');
    const filePath = join(
      this.downloadDir,
      `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`,
    );
    await download.saveAs(filePath);
    return filePath;
  }

  private describeLocator(locator: LocatorInput): string {
    switch (locator.type) {
      case 'selector':
        return locator.selector;
      case 'role':
        return `role=${locator.role}${locator.name ? ` name=${locator.name}` : ''}`;
      case 'text':
        return `text=${locator.text}`;
      case 'label':
        return `label=${locator.label}`;
      case 'placeholder':
        return `placeholder=${locator.placeholder}`;
      case 'alt':
        return `alt=${locator.alt}`;
      case 'title':
        return `title=${locator.title}`;
      case 'testId':
        return `testId=${locator.testId}`;
      default:
        return 'locator';
    }
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

    if (message.includes('Execution context was destroyed')) {
      return {
        success: false,
        error: 'Page navigated or reloaded during action.',
        suggestion: 'Wait for the page to settle and retry the action.',
      };
    }

    if (
      message.includes('Target closed') ||
      message.includes('has been closed')
    ) {
      return {
        success: false,
        error: 'Page or context was closed.',
        suggestion: 'Create a new session or reopen the page before retrying.',
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
