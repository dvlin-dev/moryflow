/**
 * CDP Connector Service
 *
 * [INPUT]: CDP WebSocket 端点或端口
 * [OUTPUT]: 已连接的 Browser 实例
 * [POS]: 连接已运行的浏览器实例（调试用），支持 Electron、远程浏览器等
 *
 * [SECURITY]: 必须通过允许主机白名单 + SSRF 校验，默认拒绝未授权地址
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { UrlValidator } from '../../common/validators/url.validator';
import {
  BROWSER_CDP_ALLOWED_HOSTS,
  BROWSER_CDP_ALLOW_PORT,
  BROWSER_CDP_ALLOW_PRIVATE_HOSTS,
} from '../browser.constants';

/** CDP 连接选项 */
export interface CdpConnectOptions {
  /** 远程浏览器 Provider */
  provider?: 'browserbase' | 'browseruse';
  /** WebSocket 端点 URL（优先使用） */
  wsEndpoint?: string;
  /** CDP 端口（使用 HTTP 获取 wsEndpoint） */
  port?: number;
  /** 连接超时（毫秒） */
  timeout?: number;
}

/** CDP 连接结果 */
export interface CdpConnection {
  /** 浏览器实例 */
  browser: Browser;
  /** 是否为 CDP 连接（区分于本地启动） */
  isCdpConnection: true;
  /** 原始 WebSocket 端点 */
  wsEndpoint: string;
  /** Provider（若为远程浏览器） */
  provider?: 'browserbase' | 'browseruse';
  /** Provider session ID */
  providerSessionId?: string;
  /** Provider API Key（用于关闭） */
  providerApiKey?: string;
}

interface ResolvedCdpTarget {
  wsEndpoint: string;
  provider?: 'browserbase' | 'browseruse';
  providerSessionId?: string;
  providerApiKey?: string;
}

/** CDP 连接失败错误 */
export class CdpConnectionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CdpConnectionError';
  }
}

/** CDP 端点无效错误 */
export class CdpEndpointError extends Error {
  constructor(endpoint: string) {
    super(`Invalid CDP endpoint: ${endpoint}`);
    this.name = 'CdpEndpointError';
  }
}

/** CDP 连接策略错误 */
export class CdpPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CdpPolicyError';
  }
}

@Injectable()
export class CdpConnectorService {
  private readonly logger = new Logger(CdpConnectorService.name);

  /** 默认连接超时 */
  private readonly DEFAULT_TIMEOUT = 30000;

  /** 已建立的 CDP 连接 */
  private readonly connections = new Map<string, CdpConnection>();

  constructor(private readonly urlValidator: UrlValidator) {}

  /**
   * 连接到已运行的浏览器
   *
   * @param options CDP 连接选项
   * @returns CDP 连接信息
   * @throws CdpConnectionError 连接失败
   * @throws CdpEndpointError 端点无效
   */
  async connect(options: CdpConnectOptions): Promise<CdpConnection> {
    const { timeout = this.DEFAULT_TIMEOUT } = options;

    // 获取 WebSocket 端点
    const target = await this.resolveTarget(options);

    await this.assertEndpointAllowed(target.wsEndpoint);

    this.logger.debug(`Connecting to CDP endpoint: ${target.wsEndpoint}`);

    try {
      const browser = await chromium.connectOverCDP(target.wsEndpoint, {
        timeout,
      });

      const connection: CdpConnection = {
        browser,
        isCdpConnection: true,
        wsEndpoint: target.wsEndpoint,
        provider: target.provider,
        providerSessionId: target.providerSessionId,
        providerApiKey: target.providerApiKey,
      };

      // 缓存连接
      this.connections.set(target.wsEndpoint, connection);

      // 监听断开事件
      browser.on('disconnected', () => {
        this.logger.debug(`CDP connection disconnected: ${target.wsEndpoint}`);
        this.connections.delete(target.wsEndpoint);
      });

      this.logger.log(
        `Successfully connected to CDP endpoint: ${target.wsEndpoint}`,
      );

      return connection;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown connection error';
      this.logger.error(`Failed to connect to CDP: ${message}`);
      throw new CdpConnectionError(
        `Failed to connect to CDP endpoint: ${message}`,
        error,
      );
    }
  }

  /**
   * 从 CDP 连接创建上下文
   *
   * @param connection CDP 连接
   * @returns BrowserContext
   */
  async createContext(connection: CdpConnection): Promise<BrowserContext> {
    // CDP 连接的浏览器可能已有上下文，获取现有上下文或创建新的
    const contexts = connection.browser.contexts();

    if (contexts.length > 0) {
      this.logger.debug(
        `Using existing context from CDP browser (${contexts.length} available)`,
      );
      return contexts[0];
    }

    // 创建新上下文
    return connection.browser.newContext({
      ignoreHTTPSErrors: true,
    });
  }

  /**
   * 断开 CDP 连接
   *
   * 注意：CDP 模式只断开连接，不关闭外部浏览器
   */
  async disconnect(connection: CdpConnection): Promise<void> {
    try {
      // 只断开 Playwright 的连接，不关闭外部浏览器
      await connection.browser.close();
      this.connections.delete(connection.wsEndpoint);
      this.logger.debug(
        `Disconnected from CDP endpoint: ${connection.wsEndpoint}`,
      );
      await this.closeProviderSession(connection);
    } catch (error) {
      this.logger.warn(`Error disconnecting from CDP: ${error}`);
    }
  }

  /**
   * 获取活跃的 CDP 连接数
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 检查 CDP 端口是否可用
   */
  async isPortAvailable(port: number): Promise<boolean> {
    if (!BROWSER_CDP_ALLOW_PORT) {
      return false;
    }

    try {
      const wsEndpoint = await this.getWsEndpointFromPort(port);
      return wsEndpoint !== null;
    } catch {
      return false;
    }
  }

  /**
   * 解析 CDP 连接目标
   */
  private async resolveTarget(
    options: CdpConnectOptions,
  ): Promise<ResolvedCdpTarget> {
    if (options.provider === 'browserbase') {
      return this.createBrowserbaseSession();
    }

    if (options.provider === 'browseruse') {
      return this.createBrowserUseSession();
    }

    const wsEndpoint = await this.resolveWsEndpointDirect(options);
    return { wsEndpoint };
  }

  private async resolveWsEndpointDirect(
    options: CdpConnectOptions,
  ): Promise<string> {
    // 优先使用直接提供的 wsEndpoint
    if (options.wsEndpoint) {
      if (!this.isValidWsEndpoint(options.wsEndpoint)) {
        throw new CdpEndpointError(options.wsEndpoint);
      }
      return options.wsEndpoint;
    }

    // 使用端口获取 wsEndpoint
    if (options.port) {
      if (!BROWSER_CDP_ALLOW_PORT) {
        throw new CdpPolicyError(
          'CDP port-based connection is disabled. Use wsEndpoint instead.',
        );
      }
      const allowlist = BROWSER_CDP_ALLOWED_HOSTS.map((host) =>
        host.trim().toLowerCase(),
      ).filter(Boolean);
      if (allowlist.length === 0) {
        throw new CdpPolicyError(
          'CDP connection is disabled. Configure BROWSER_CDP_ALLOWED_HOSTS to enable.',
        );
      }
      const localhostAllowed =
        this.isHostAllowed('localhost', allowlist) ||
        this.isHostAllowed('127.0.0.1', allowlist) ||
        this.isHostAllowed('::1', allowlist);
      if (!localhostAllowed) {
        throw new CdpPolicyError(
          'CDP port-based connection requires localhost to be allowlisted.',
        );
      }
      const wsEndpoint = await this.getWsEndpointFromPort(options.port);
      if (!wsEndpoint) {
        throw new CdpConnectionError(
          `Cannot get WebSocket endpoint from port ${options.port}. ` +
            `Make sure the browser is running with --remote-debugging-port=${options.port}`,
        );
      }
      return wsEndpoint;
    }

    throw new CdpConnectionError(
      'Either wsEndpoint or port must be provided for CDP connection',
    );
  }

  /**
   * 从 CDP 端口获取 WebSocket 端点
   */
  private async getWsEndpointFromPort(port: number): Promise<string | null> {
    try {
      // Chrome DevTools Protocol 提供 /json/version 端点返回 wsEndpoint
      const response = await fetch(`http://localhost:${port}/json/version`);

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { webSocketDebuggerUrl?: string };
      return data.webSocketDebuggerUrl ?? null;
    } catch {
      return null;
    }
  }

  private async createBrowserbaseSession(): Promise<ResolvedCdpTarget> {
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
      throw new CdpConnectionError(
        'BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID are required for browserbase provider.',
      );
    }

    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': apiKey,
      },
      body: JSON.stringify({ projectId }),
    });

    if (!response.ok) {
      throw new CdpConnectionError(
        `Failed to create Browserbase session: ${response.statusText}`,
      );
    }

    const session = (await response.json()) as {
      id?: string;
      connectUrl?: string;
    };

    if (!session.id || !session.connectUrl) {
      throw new CdpConnectionError('Invalid Browserbase session response.');
    }

    if (!this.isValidWsEndpoint(session.connectUrl)) {
      throw new CdpEndpointError(session.connectUrl);
    }

    return {
      wsEndpoint: session.connectUrl,
      provider: 'browserbase',
      providerSessionId: session.id,
      providerApiKey: apiKey,
    };
  }

  private async createBrowserUseSession(): Promise<ResolvedCdpTarget> {
    const apiKey = process.env.BROWSER_USE_API_KEY;
    if (!apiKey) {
      throw new CdpConnectionError(
        'BROWSER_USE_API_KEY is required for browseruse provider.',
      );
    }

    const response = await fetch(
      'https://api.browser-use.com/api/v2/browsers',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Browser-Use-API-Key': apiKey,
        },
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      throw new CdpConnectionError(
        `Failed to create Browser Use session: ${response.statusText}`,
      );
    }

    const session = (await response.json()) as { id?: string; cdpUrl?: string };

    if (!session.id || !session.cdpUrl) {
      throw new CdpConnectionError('Invalid Browser Use session response.');
    }

    if (!this.isValidWsEndpoint(session.cdpUrl)) {
      throw new CdpEndpointError(session.cdpUrl);
    }

    return {
      wsEndpoint: session.cdpUrl,
      provider: 'browseruse',
      providerSessionId: session.id,
      providerApiKey: apiKey,
    };
  }

  private async closeProviderSession(connection: CdpConnection): Promise<void> {
    if (!connection.provider || !connection.providerSessionId) {
      return;
    }

    if (connection.provider === 'browserbase') {
      await this.closeBrowserbaseSession(
        connection.providerSessionId,
        connection.providerApiKey,
      );
      return;
    }

    if (connection.provider === 'browseruse') {
      await this.closeBrowserUseSession(
        connection.providerSessionId,
        connection.providerApiKey,
      );
    }
  }

  private async closeBrowserbaseSession(
    sessionId: string,
    apiKey?: string,
  ): Promise<void> {
    if (!apiKey) return;
    await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'X-BB-API-Key': apiKey,
      },
    }).catch(() => undefined);
  }

  private async closeBrowserUseSession(
    sessionId: string,
    apiKey?: string,
  ): Promise<void> {
    if (!apiKey) return;
    await fetch(`https://api.browser-use.com/api/v2/browsers/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Browser-Use-API-Key': apiKey,
      },
      body: JSON.stringify({ action: 'stop' }),
    }).catch(() => undefined);
  }

  /**
   * 验证 WebSocket 端点格式
   */
  private isValidWsEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint);
      return url.protocol === 'ws:' || url.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  private async assertEndpointAllowed(wsEndpoint: string): Promise<void> {
    const url = new URL(wsEndpoint);
    const hostname = url.hostname.toLowerCase();
    const allowedHosts = BROWSER_CDP_ALLOWED_HOSTS.map((host) =>
      host.trim().toLowerCase(),
    ).filter(Boolean);

    if (allowedHosts.length === 0) {
      throw new CdpPolicyError(
        'CDP connection is disabled. Configure BROWSER_CDP_ALLOWED_HOSTS to enable.',
      );
    }

    if (!this.isHostAllowed(hostname, allowedHosts)) {
      throw new CdpPolicyError(`CDP host is not allowed: ${hostname}.`);
    }

    if (!BROWSER_CDP_ALLOW_PRIVATE_HOSTS) {
      const normalizedUrl = this.normalizeWsEndpoint(wsEndpoint);
      const allowed = await this.urlValidator.isAllowed(normalizedUrl);
      if (!allowed) {
        throw new CdpPolicyError('CDP endpoint is not allowed by SSRF policy.');
      }
    }
  }

  private normalizeWsEndpoint(endpoint: string): string {
    if (endpoint.startsWith('ws://')) {
      return endpoint.replace(/^ws:/i, 'http:');
    }
    return endpoint.replace(/^wss:/i, 'https:');
  }

  private isHostAllowed(hostname: string, allowlist: string[]): boolean {
    return allowlist.some((entry) => {
      if (entry.startsWith('*.')) {
        const suffix = entry.slice(2);
        return hostname === suffix || hostname.endsWith(`.${suffix}`);
      }
      return hostname === entry;
    });
  }
}
