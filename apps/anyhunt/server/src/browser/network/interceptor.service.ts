/**
 * Network Interceptor Service
 *
 * [INPUT]: 拦截规则、请求事件
 * [OUTPUT]: 修改后的请求/响应或 mock 数据
 * [POS]: 管理网络拦截规则，支持请求头修改、响应 mock、请求阻止
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Page, Route, Request, Response } from 'playwright';
import type { InterceptRule, NetworkRequestRecord } from '../dto';
import { UrlValidator } from '../../common/validators/url.validator';

/** 会话拦截状态 */
interface SessionInterceptState {
  /** 拦截规则 */
  rules: Map<string, InterceptRule>;
  /** 请求记录（最近 100 条） */
  requestHistory: NetworkRequestRecord[];
  /** 是否已启用路由拦截 */
  routingEnabled: boolean;
  /** 清理函数 */
  cleanup?: () => Promise<void>;
}

/** 拦截规则无效错误 */
export class InvalidInterceptRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInterceptRuleError';
  }
}

@Injectable()
export class NetworkInterceptorService {
  private readonly logger = new Logger(NetworkInterceptorService.name);
  private readonly NON_HTTP_ALLOWLIST = new Set(['about:', 'data:', 'blob:']);

  /** 会话拦截状态 */
  private readonly sessionStates = new Map<string, SessionInterceptState>();

  /** 请求历史最大条数 */
  private readonly MAX_HISTORY_SIZE = 100;

  constructor(private readonly urlValidator: UrlValidator) {}

  /**
   * 设置拦截规则
   */
  async setRules(
    sessionId: string,
    page: Page,
    rules: InterceptRule[],
  ): Promise<{ rulesCount: number }> {
    const state = this.getOrCreateState(sessionId);

    // 验证规则
    for (const rule of rules) {
      this.validateRule(rule);
    }

    // 清除旧规则
    state.rules.clear();

    // 添加新规则
    for (const rule of rules) {
      const ruleId = rule.id ?? this.generateRuleId();
      state.rules.set(ruleId, { ...rule, id: ruleId });
    }

    // 启用路由拦截（如果尚未启用）
    if (!state.routingEnabled && rules.length > 0) {
      await this.enableRouting(sessionId, page, state);
    }

    this.logger.debug(
      `Set ${rules.length} intercept rules for session ${sessionId}`,
    );

    return { rulesCount: state.rules.size };
  }

  /**
   * 添加单条规则
   */
  async addRule(
    sessionId: string,
    page: Page,
    rule: InterceptRule,
  ): Promise<{ ruleId: string }> {
    const state = this.getOrCreateState(sessionId);

    this.validateRule(rule);

    const ruleId = rule.id ?? this.generateRuleId();
    state.rules.set(ruleId, { ...rule, id: ruleId });

    // 启用路由拦截（如果尚未启用）
    if (!state.routingEnabled) {
      await this.enableRouting(sessionId, page, state);
    }

    this.logger.debug(
      `Added intercept rule ${ruleId} for session ${sessionId}`,
    );

    return { ruleId };
  }

  /**
   * 删除规则
   */
  removeRule(sessionId: string, ruleId: string): boolean {
    const state = this.sessionStates.get(sessionId);
    if (!state) {
      return false;
    }

    const deleted = state.rules.delete(ruleId);

    if (deleted) {
      this.logger.debug(
        `Removed intercept rule ${ruleId} from session ${sessionId}`,
      );
    }

    return deleted;
  }

  /**
   * 清除所有规则
   */

  async clearRules(sessionId: string): Promise<void> {
    const state = this.sessionStates.get(sessionId);
    if (!state) {
      return;
    }

    state.rules.clear();

    // 禁用路由拦截
    if (state.routingEnabled && state.cleanup) {
      await state.cleanup();
      state.routingEnabled = false;
      state.cleanup = undefined;
    }

    this.logger.debug(`Cleared all intercept rules for session ${sessionId}`);
  }

  /**
   * 获取当前规则列表
   */
  getRules(sessionId: string): InterceptRule[] {
    const state = this.sessionStates.get(sessionId);
    if (!state) {
      return [];
    }

    return Array.from(state.rules.values());
  }

  /**
   * 获取请求历史
   */
  getRequestHistory(
    sessionId: string,
    options?: { limit?: number; urlFilter?: string },
  ): NetworkRequestRecord[] {
    const state = this.sessionStates.get(sessionId);
    if (!state) {
      return [];
    }

    let history = state.requestHistory;

    // URL 过滤
    if (options?.urlFilter) {
      const filter = options.urlFilter.toLowerCase();
      history = history.filter((r) => r.url.toLowerCase().includes(filter));
    }

    // 限制数量
    if (options?.limit && options.limit > 0) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * 清除请求历史
   */
  clearHistory(sessionId: string): void {
    const state = this.sessionStates.get(sessionId);
    if (state) {
      state.requestHistory = [];
    }
  }

  /**
   * 清理会话状态
   */
  async cleanupSession(sessionId: string): Promise<void> {
    const state = this.sessionStates.get(sessionId);
    if (state) {
      if (state.cleanup) {
        await state.cleanup();
      }
      this.sessionStates.delete(sessionId);
      this.logger.debug(
        `Cleaned up network interceptor for session ${sessionId}`,
      );
    }
  }

  /**
   * 启用路由拦截
   */
  private async enableRouting(
    sessionId: string,
    page: Page,
    state: SessionInterceptState,
  ): Promise<void> {
    // 设置路由处理器
    const handler = async (route: Route, request: Request) => {
      await this.handleRoute(sessionId, state, route, request);
    };

    // 拦截所有请求
    await page.route('**/*', handler);

    state.routingEnabled = true;
    state.cleanup = async () => {
      try {
        await page.unroute('**/*', handler);
      } catch {
        // 页面可能已关闭，忽略错误
      }
    };

    this.logger.debug(`Enabled routing for session ${sessionId}`);
  }

  /**
   * 处理路由
   */
  private async handleRoute(
    sessionId: string,
    state: SessionInterceptState,
    route: Route,
    request: Request,
  ): Promise<void> {
    const url = request.url();
    const method = request.method();

    // 记录请求
    const record: NetworkRequestRecord = {
      id: this.generateRequestId(),
      url,
      method,
      headers: request.headers(),
      postData: request.postData() ?? undefined,
      intercepted: false,
      timestamp: Date.now(),
    };

    const protocol = this.getProtocol(url);
    if (!protocol) {
      record.intercepted = true;
      this.addToHistory(state, record);
      await route.abort('blockedbyclient');
      return;
    }

    if (protocol === 'http:' || protocol === 'https:') {
      if (!(await this.urlValidator.isAllowed(url))) {
        record.intercepted = true;
        this.addToHistory(state, record);
        await route.abort('blockedbyclient');
        return;
      }
    } else if (protocol === 'ws:' || protocol === 'wss:') {
      const normalizedUrl =
        protocol === 'ws:'
          ? url.replace(/^ws:/i, 'http:')
          : url.replace(/^wss:/i, 'https:');
      if (!(await this.urlValidator.isAllowed(normalizedUrl))) {
        record.intercepted = true;
        this.addToHistory(state, record);
        await route.abort('blockedbyclient');
        return;
      }
    } else if (!this.NON_HTTP_ALLOWLIST.has(protocol)) {
      record.intercepted = true;
      this.addToHistory(state, record);
      await route.abort('blockedbyclient');
      return;
    }

    // 查找匹配的规则
    const matchingRule = this.findMatchingRule(state.rules, url, method);

    if (!matchingRule) {
      // 无匹配规则，继续原始请求
      this.addToHistory(state, record);
      await route.continue();
      return;
    }

    record.intercepted = true;

    // 处理阻止规则
    if (matchingRule.block) {
      this.addToHistory(state, record);
      await route.abort('blockedbyclient');
      this.logger.debug(`Blocked request: ${method} ${url}`);
      return;
    }

    // 处理 mock 响应
    if (matchingRule.mockResponse) {
      const { status, headers, body, contentType } = matchingRule.mockResponse;

      record.status = status;
      record.responseHeaders = {
        'content-type': contentType,
        ...headers,
      };

      this.addToHistory(state, record);

      await route.fulfill({
        status,
        headers: {
          'content-type': contentType,
          ...headers,
        },
        body: body ?? '',
      });

      this.logger.debug(`Mocked response for: ${method} ${url}`);
      return;
    }

    // 处理请求头修改
    if (matchingRule.modifyHeaders) {
      const modifiedHeaders = {
        ...request.headers(),
        ...matchingRule.modifyHeaders,
      };

      this.addToHistory(state, record);

      await route.continue({
        headers: modifiedHeaders,
      });

      this.logger.debug(`Modified headers for: ${method} ${url}`);
      return;
    }

    // 默认继续请求
    this.addToHistory(state, record);
    await route.continue();
  }

  /**
   * 查找匹配的规则
   */
  private findMatchingRule(
    rules: Map<string, InterceptRule>,
    url: string,
    method: string,
  ): InterceptRule | null {
    for (const rule of rules.values()) {
      // 检查方法过滤
      if (rule.method && rule.method !== method) {
        continue;
      }

      // 检查 URL 模式匹配
      if (this.matchUrlPattern(url, rule.urlPattern)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * URL 模式匹配（支持 glob）
   */
  private matchUrlPattern(url: string, pattern: string): boolean {
    // 转换 glob 模式为正则表达式
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
      .replace(/\*/g, '.*') // * 匹配任意字符
      .replace(/\?/g, '.'); // ? 匹配单个字符

    try {
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(url);
    } catch {
      // 无效的正则，使用简单包含匹配
      return url.includes(pattern);
    }
  }

  /**
   * 验证规则
   */
  private validateRule(rule: InterceptRule): void {
    if (!rule.urlPattern || rule.urlPattern.trim() === '') {
      throw new InvalidInterceptRuleError('urlPattern is required');
    }

    // 检查规则至少有一个操作
    if (
      !rule.block &&
      !rule.mockResponse &&
      (!rule.modifyHeaders || Object.keys(rule.modifyHeaders).length === 0)
    ) {
      throw new InvalidInterceptRuleError(
        'Rule must have at least one action: block, mockResponse, or modifyHeaders',
      );
    }
  }

  /**
   * 添加请求到历史记录
   */
  private addToHistory(
    state: SessionInterceptState,
    record: NetworkRequestRecord,
  ): void {
    state.requestHistory.push(record);

    // 限制历史大小
    if (state.requestHistory.length > this.MAX_HISTORY_SIZE) {
      state.requestHistory.shift();
    }
  }

  /**
   * 获取或创建会话状态
   */
  private getOrCreateState(sessionId: string): SessionInterceptState {
    let state = this.sessionStates.get(sessionId);
    if (!state) {
      state = {
        rules: new Map(),
        requestHistory: [],
        routingEnabled: false,
      };
      this.sessionStates.set(sessionId, state);
    }
    return state;
  }

  /**
   * 生成规则 ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private getProtocol(url: string): string | null {
    try {
      return new URL(url).protocol;
    } catch {
      return null;
    }
  }
}
