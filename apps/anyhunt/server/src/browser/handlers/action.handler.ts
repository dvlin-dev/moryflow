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
import { promises as fs } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Locator, Page, Download } from 'playwright';
import { SessionManager, type BrowserSession } from '../session';
import { BrowserRiskTelemetryService } from '../observability';
import { ActionPacingService, HumanBehaviorService } from '../runtime';
import {
  BROWSER_DOWNLOAD_MAX_BYTES,
  BROWSER_UPLOAD_MAX_BYTES,
} from '../browser.constants';
import type {
  ActionInput,
  ActionResponse,
  LocatorInput,
  LocatorSelectorInput,
} from '../dto';

@Injectable()
export class ActionHandler {
  private readonly logger = new Logger(ActionHandler.name);

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly actionPacing: ActionPacingService,
    private readonly riskTelemetry: BrowserRiskTelemetryService,
    private readonly humanBehavior: HumanBehaviorService,
  ) {}

  /**
   * 执行动作
   */
  async execute(
    session: BrowserSession,
    action: ActionInput,
  ): Promise<ActionResponse> {
    const { type, timeout = 5000 } = action;
    const page = this.sessionManager.getActivePage(session);
    const context = this.sessionManager.getActiveContext(session);

    try {
      const pacing = await this.actionPacing.beforeAction({
        sessionId: session.id,
        actionType: type,
      });
      if (pacing.applied) {
        this.riskTelemetry.recordActionPacing({
          sessionId: session.id,
          host: extractHost(page.url()),
          actionType: type,
          delayMs: pacing.delayMs,
        });
      }

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
          await page.goBack({ timeout });
          return { success: true };

        case 'forward':
          await page.goForward({ timeout });
          return { success: true };

        case 'reload':
          await page.reload({ timeout });
          return { success: true };

        // ===== 交互 =====
        case 'click':
          return await this.handleClick(locator!, action, page);

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
            delay: this.humanBehavior.computeTypingDelay(50),
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
            await page.keyboard.press(action.key);
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
          const filePayloads = this.buildUploadPayloads(action.files);
          await locator!.setInputFiles(filePayloads);
          return { success: true, result: { count: filePayloads.length } };
        }

        case 'highlight':
          await this.highlightLocator(locator!);
          return { success: true };

        // ===== 滚动 =====
        case 'scroll':
          return await this.handleScroll(page, action, locator);

        case 'scrollIntoView':
          await locator!.scrollIntoViewIfNeeded({ timeout });
          return { success: true };

        // ===== 等待 =====
        case 'wait':
          return await this.handleWait(session, page, action);

        // ===== 脚本 / 内容 =====
        case 'evaluate': {
          if (!action.script) {
            throw new Error('evaluate requires script');
          }
          const result = await page.evaluate(action.script, action.arg);
          return { success: true, result };
        }

        case 'setContent': {
          if (!action.html) {
            throw new Error('setContent requires html');
          }
          await page.setContent(action.html, {
            waitUntil: 'domcontentloaded',
          });
          return { success: true };
        }

        case 'pdf': {
          const buffer = await page.pdf({
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
          return await this.handleDownload(page, locator, action, timeout);

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
          await page.setViewportSize(action.viewport);
          return { success: true };
        }

        case 'setGeolocation': {
          if (!action.geolocation) {
            throw new Error('setGeolocation requires geolocation');
          }
          await context.setGeolocation(action.geolocation);
          return { success: true };
        }

        case 'setPermissions': {
          if (!action.permissions || action.permissions.length === 0) {
            throw new Error('setPermissions requires permissions');
          }
          await context.grantPermissions(action.permissions);
          return { success: true };
        }

        case 'clearPermissions': {
          await context.clearPermissions();
          return { success: true };
        }

        case 'setMedia': {
          await page.emulateMedia({
            colorScheme: action.colorScheme,
            reducedMotion: action.reducedMotion,
          });
          return { success: true };
        }

        case 'setOffline': {
          if (action.offline === undefined) {
            throw new Error('setOffline requires offline');
          }
          await context.setOffline(action.offline);
          return { success: true };
        }

        case 'setHeaders': {
          if (!action.headers) {
            throw new Error('setHeaders requires headers');
          }
          await context.setExtraHTTPHeaders(action.headers);
          return { success: true };
        }

        case 'setHttpCredentials': {
          if (!action.httpCredentials) {
            throw new Error('setHttpCredentials requires httpCredentials');
          }
          await context.setHTTPCredentials(action.httpCredentials);
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
    page: Page,
  ): Promise<ActionResponse> {
    const { clickOptions, timeout = 5000 } = action;

    // stealth: Bezier 鼠标曲线移动到目标位置
    try {
      const box = await locator.boundingBox();
      if (box) {
        const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
        const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
        await this.humanBehavior.humanMouseMove(page, targetX, targetY);
      }
    } catch {
      // Bezier 失败不影响点击
    }

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
    page: Page,
    action: ActionInput,
  ): Promise<ActionResponse> {
    const { waitFor, timeout = 5000 } = action;

    if (!waitFor) {
      throw new Error('wait requires a waitFor condition');
    }

    if (waitFor.time !== undefined) {
      await page.waitForTimeout(waitFor.time);
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
      await page.waitForURL(waitFor.url, { timeout });
      return { success: true };
    }

    if (waitFor.text) {
      await page.waitForFunction(
        (text) => document.body.textContent?.includes(text),
        waitFor.text,
        { timeout },
      );
      return { success: true };
    }

    if (waitFor.networkIdle) {
      await page.waitForLoadState('networkidle', { timeout });
      return { success: true };
    }

    if (waitFor.loadState) {
      await page.waitForLoadState(waitFor.loadState, { timeout });
      return { success: true };
    }

    if (waitFor.function) {
      await page.waitForFunction(waitFor.function, { timeout });
      return { success: true };
    }

    if (waitFor.download) {
      const download = await page.waitForEvent('download', { timeout });
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
    page: Page,
    locator: Locator | undefined,
    action: ActionInput,
    timeout: number,
  ): Promise<ActionResponse> {
    const downloadPromise = page.waitForEvent('download', { timeout });

    if (locator) {
      await locator.click({ timeout });
    }

    const download = await downloadPromise;
    const filename = this.sanitizeFilename(download.suggestedFilename());

    if (action.storeDownload === false) {
      await download.delete().catch(() => undefined);
      return {
        success: true,
        result: {
          url: download.url(),
          filename,
        },
      };
    }

    let filePath: string | null = null;
    let savedCopy = false;

    try {
      const originalPath = await download.path();
      if (originalPath) {
        filePath = originalPath;
      } else {
        filePath = await this.saveDownload(download);
        savedCopy = true;
      }

      const stats = await fs.stat(filePath);
      if (stats.size > BROWSER_DOWNLOAD_MAX_BYTES) {
        return {
          success: false,
          error: `Download size exceeds limit (${BROWSER_DOWNLOAD_MAX_BYTES} bytes).`,
        };
      }

      const data = await fs.readFile(filePath);

      return {
        success: true,
        result: {
          url: download.url(),
          filename,
          data: data.toString('base64'),
          size: data.length,
        },
      };
    } finally {
      if (filePath) {
        await this.cleanupDownload(download, filePath, savedCopy);
      } else {
        await download.delete().catch(() => undefined);
      }
    }
  }

  private async saveDownload(download: Download): Promise<string> {
    const filePath = join(tmpdir(), `anyhunt-download-${randomUUID()}`);
    await download.saveAs(filePath);
    return filePath;
  }

  private async cleanupDownload(
    download: Download,
    filePath: string,
    savedCopy: boolean,
  ): Promise<void> {
    if (savedCopy) {
      await fs.unlink(filePath).catch(() => undefined);
    }
    await download.delete().catch(() => undefined);
  }

  private sanitizeFilename(name: string): string {
    const base = basename(name);
    const sanitized = base.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 200);
    return sanitized.length > 0 ? sanitized : 'download';
  }

  private buildUploadPayloads(files: NonNullable<ActionInput['files']>): Array<{
    name: string;
    mimeType: string;
    buffer: Buffer;
  }> {
    const payloads = Array.isArray(files) ? files : [files];
    return payloads.map((file) => {
      const buffer = Buffer.from(file.dataBase64, 'base64');
      if (buffer.length > BROWSER_UPLOAD_MAX_BYTES) {
        throw new Error(
          `Upload file too large (max ${BROWSER_UPLOAD_MAX_BYTES} bytes).`,
        );
      }
      return {
        name: this.sanitizeFilename(file.name),
        mimeType: file.mimeType ?? 'application/octet-stream',
        buffer,
      };
    });
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

const extractHost = (url: string): string => {
  if (!url) return 'unknown';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return 'unknown';
  }
};
