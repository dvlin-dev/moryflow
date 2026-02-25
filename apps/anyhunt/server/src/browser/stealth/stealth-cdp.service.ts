/**
 * [INPUT]: Browser 或 Page 实例 + StealthScriptOptions
 * [OUTPUT]: CDP 级别 UA/元数据覆写完成
 * [POS]: 通过 CDP 协议覆写 User-Agent 及元数据，去除 HeadlessChrome 标记
 *
 * Browser 级别：覆写所有已有 targets 后立即 detach
 * Page 级别：覆写后不 detach（Worker UA 覆写需要 CDP session 持续生效）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Browser, CDPSession, Page } from 'playwright';
import type { StealthScriptOptions } from './stealth.types';

interface CdpSessionLike {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  detach(): Promise<void>;
}

interface BrowserWithCdp extends Browser {
  newBrowserCDPSession(): Promise<CDPSession>;
}

@Injectable()
export class StealthCdpService {
  private readonly logger = new Logger(StealthCdpService.name);
  private commandId = 1;
  private readonly pageCdpSessions = new WeakMap<Page, CdpSessionLike>();

  /**
   * Browser 级别 CDP 覆写：遍历所有 target，覆写 UA + metadata
   * 完成后立即 detach — 一次性操作
   */
  async applyBrowserLevelStealth(
    browser: Browser,
    options: StealthScriptOptions = {},
  ): Promise<void> {
    if (!isBrowserWithCdp(browser)) {
      this.logger.debug(
        'Browser-level CDP stealth skipped (non-Chromium or unavailable)',
      );
      return;
    }

    let cdp: CdpSessionLike | null = null;
    try {
      // Playwright 仅在 Chromium 类型上暴露 newBrowserCDPSession
      cdp = toCdpSessionLike(await browser.newBrowserCDPSession());
      if (!cdp) {
        this.logger.debug(
          'Browser-level CDP stealth skipped (non-Chromium or unavailable)',
        );
        return;
      }

      try {
        const version = await this.sendCdpCommand(cdp, 'Browser.getVersion');
        const rawUA = getStringField(version, 'userAgent') ?? '';
        const explicitUA = options.userAgent?.trim();

        // 非 headless 且无显式 UA — 无需覆写
        if (!explicitUA && !rawUA.includes('HeadlessChrome')) {
          return;
        }

        const patchedUA =
          explicitUA || rawUA.replace(/HeadlessChrome/g, 'Chrome');
        if (!patchedUA) {
          return;
        }

        const overrideParams = buildUserAgentOverrideParams({
          patchedUA,
          acceptLanguage: normalizeAcceptLanguage(options.acceptLanguage),
        });
        const metadata = buildUserAgentMetadata(patchedUA);

        const targetsPayload = await this.sendCdpCommand(
          cdp,
          'Target.getTargets',
        );
        const targetIds = extractTargetIds(targetsPayload);
        for (const targetId of targetIds) {
          try {
            const attachPayload = await this.sendCdpCommand(
              cdp,
              'Target.attachToTarget',
              {
                targetId,
                flatten: false,
              },
            );
            const sessionId = getStringField(attachPayload, 'sessionId');
            if (!sessionId) {
              continue;
            }

            await this.sendMessageToTarget(
              cdp,
              sessionId,
              'Emulation.setUserAgentOverride',
              {
                ...overrideParams,
                userAgentMetadata: metadata,
                platform: getPlatformString(),
              },
            );

            await this.sendCdpCommand(cdp, 'Target.detachFromTarget', {
              sessionId,
            }).catch(() => undefined);
          } catch {
            // 部分 target 不支持 Emulation domain
          }
        }
      } finally {
        if (cdp) {
          await cdp.detach().catch(() => undefined);
        }
      }
    } catch {
      // newBrowserCDPSession 不可用（非 Chromium）— 静默跳过
      this.logger.debug(
        'Browser-level CDP stealth skipped (non-Chromium or unavailable)',
      );
    }
  }

  /**
   * Page 级别 CDP 覆写：覆写后不 detach（Worker UA 覆写需要 session 存活）
   */
  async applyPageLevelStealth(
    page: Page,
    options: StealthScriptOptions = {},
  ): Promise<void> {
    try {
      if (this.pageCdpSessions.has(page)) {
        return;
      }

      const cdp = toCdpSessionLike(await page.context().newCDPSession(page));
      if (!cdp) {
        this.logger.debug(
          'Page-level CDP stealth skipped (non-Chromium or unavailable)',
        );
        return;
      }

      // 保持 page 生命周期内的 CDP session，确保 Worker 覆写持续生效
      this.pageCdpSessions.set(page, cdp);
      page.once('close', () => {
        void cdp.detach().catch(() => undefined);
        this.pageCdpSessions.delete(page);
      });

      const uaPayload = await this.sendCdpCommand(
        cdp,
        'Browser.getVersion',
      ).catch(() => null);
      const rawUA = getStringField(uaPayload, 'userAgent') ?? '';
      const explicitUA = options.userAgent?.trim();
      const patchedUA =
        explicitUA || rawUA.replace(/HeadlessChrome/g, 'Chrome');
      if (!patchedUA) {
        return;
      }
      const metadata = buildUserAgentMetadata(patchedUA);

      await this.sendCdpCommand(cdp, 'Emulation.setUserAgentOverride', {
        ...buildUserAgentOverrideParams({
          patchedUA,
          acceptLanguage: normalizeAcceptLanguage(options.acceptLanguage),
        }),
        userAgentMetadata: metadata,
        platform: getPlatformString(),
      });

      // 白色背景覆写（headless 默认透明）
      await this.sendCdpCommand(
        cdp,
        'Emulation.setDefaultBackgroundColorOverride',
        {
          color: { r: 255, g: 255, b: 255, a: 1 },
        },
      ).catch(() => undefined);

      // 不 detach — Worker UA 覆写需要 CDP session 持续生效
    } catch {
      // 非 Chromium — 静默跳过
      this.logger.debug(
        'Page-level CDP stealth skipped (non-Chromium or unavailable)',
      );
    }
  }

  private async sendMessageToTarget(
    cdp: CdpSessionLike,
    sessionId: string,
    method: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    const id = this.commandId++;
    await this.sendCdpCommand(cdp, 'Target.sendMessageToTarget', {
      sessionId,
      message: JSON.stringify({ id, method, params }),
    });
  }

  private async sendCdpCommand(
    cdp: CdpSessionLike,
    method: string,
    params?: Record<string, unknown>,
  ): Promise<unknown> {
    return cdp.send(method, params);
  }
}

// ---------------------------------------------------------------------------
// 内部工具函数
// ---------------------------------------------------------------------------

function isBrowserWithCdp(browser: Browser): browser is BrowserWithCdp {
  const candidate = browser as Partial<BrowserWithCdp>;
  return typeof candidate.newBrowserCDPSession === 'function';
}

function toCdpSessionLike(value: unknown): CdpSessionLike | null {
  if (!isRecord(value)) {
    return null;
  }
  const send = value.send;
  const detach = value.detach;
  if (typeof send !== 'function' || typeof detach !== 'function') {
    return null;
  }
  return {
    send: send as CdpSessionLike['send'],
    detach: detach as CdpSessionLike['detach'],
  };
}

function extractTargetIds(payload: unknown): string[] {
  if (!isRecord(payload)) return [];
  const targetInfos = payload.targetInfos;
  if (!Array.isArray(targetInfos)) return [];

  return targetInfos
    .map((targetInfo) => getStringField(targetInfo, 'targetId'))
    .filter((targetId): targetId is string => Boolean(targetId));
}

function getStringField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const fieldValue = value[field];
  return typeof fieldValue === 'string' ? fieldValue : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// ---------------------------------------------------------------------------
// UA/平台覆写工具函数
// ---------------------------------------------------------------------------

function buildUserAgentMetadata(patchedUA: string) {
  const versionMatch = patchedUA.match(/Chrome\/(\d+)/);
  const majorVersion = versionMatch?.[1] ?? '120';
  const fullVersionMatch = patchedUA.match(/Chrome\/([\d.]+)/);
  const fullVersion = fullVersionMatch?.[1] ?? `${majorVersion}.0.0.0`;

  return {
    brands: [
      { brand: 'Chromium', version: majorVersion },
      { brand: 'Google Chrome', version: majorVersion },
      { brand: 'Not-A.Brand', version: '99' },
    ],
    fullVersionList: [
      { brand: 'Chromium', version: fullVersion },
      { brand: 'Google Chrome', version: fullVersion },
      { brand: 'Not-A.Brand', version: '99.0.0.0' },
    ],
    fullVersion,
    platform: getPlatformHint(),
    platformVersion: getPlatformVersionHint(),
    architecture: 'x86',
    model: '',
    mobile: false,
    bitness: '64',
    wow64: false,
  };
}

function buildUserAgentOverrideParams(input: {
  patchedUA: string;
  acceptLanguage?: string;
}): {
  userAgent: string;
  acceptLanguage?: string;
} {
  const params: { userAgent: string; acceptLanguage?: string } = {
    userAgent: input.patchedUA,
  };
  if (input.acceptLanguage) {
    params.acceptLanguage = input.acceptLanguage;
  }
  return params;
}

function normalizeAcceptLanguage(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed
    .replace(/;q=1(?:\.0+)?/gi, '')
    .replace(/(?:;q=[0-9.]+)+/gi, (match) => {
      const first = match.match(/;q=[0-9.]+/i)?.[0];
      return first ?? '';
    });
}

function getPlatformString(): string {
  if (process.platform === 'darwin') return 'macOS';
  if (process.platform === 'win32') return 'Windows';
  return 'Linux';
}

function getPlatformHint(): string {
  return getPlatformString();
}

function getPlatformVersionHint(): string {
  if (process.platform === 'darwin') return '13.0.0';
  if (process.platform === 'win32') return '10.0.0';
  return '6.1.0';
}
