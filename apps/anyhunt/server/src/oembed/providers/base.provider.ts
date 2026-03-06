/**
 * oEmbed Provider 基类
 */
import { Logger } from '@nestjs/common';
import { OEMBED_REQUEST_TIMEOUT_MS } from '../oembed.constants';
import {
  NotFoundError,
  ProviderError,
  RateLimitedError,
  TimeoutError,
} from '../oembed.errors';
import type { OembedData, OembedOptions, ProviderName } from '../oembed.types';
import {
  serverHttpJson,
  ServerApiError,
} from '../../common/http/server-http-client';

export abstract class BaseOembedProvider {
  protected readonly logger: Logger;

  /** Provider 名称 */
  abstract readonly name: ProviderName;

  /** oEmbed API Endpoint */
  abstract readonly endpoint: string;

  /** URL 匹配正则 */
  abstract readonly patterns: RegExp[];

  /** 缓存时间（秒） */
  abstract readonly cacheTtlSeconds: number;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /** 检查 URL 是否匹配此 Provider */
  matches(url: string): boolean {
    return this.patterns.some((pattern) => pattern.test(url));
  }

  /** 获取 oEmbed 数据 */
  async fetch(url: string, options?: OembedOptions): Promise<OembedData> {
    const endpoint = this.buildEndpoint(url, options);
    this.logger.debug(`Fetching oEmbed from ${endpoint}`);

    try {
      const data = await serverHttpJson<OembedData>({
        url: endpoint,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'anyhunt/1.0',
        },
        timeoutMs: OEMBED_REQUEST_TIMEOUT_MS,
      });
      return this.normalizeResponse(data);
    } catch (error) {
      if (error instanceof ServerApiError) {
        this.handleErrorResponse(error.status, url);
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(this.name, OEMBED_REQUEST_TIMEOUT_MS);
      }
      if (
        error instanceof NotFoundError ||
        error instanceof ProviderError ||
        error instanceof RateLimitedError
      ) {
        throw error;
      }
      this.logger.error(`Provider fetch error: ${(error as Error).message}`);
      throw new ProviderError(this.name, (error as Error).message);
    }
  }

  /** 构建上游请求 URL */
  protected buildEndpoint(url: string, options?: OembedOptions): string {
    const params = new URLSearchParams();
    params.set('url', url);
    params.set('format', 'json');

    if (options?.maxwidth) {
      params.set('maxwidth', String(options.maxwidth));
    }
    if (options?.maxheight) {
      params.set('maxheight', String(options.maxheight));
    }

    // 子类可覆盖添加额外参数
    this.appendExtraParams(params, options);

    return `${this.endpoint}?${params.toString()}`;
  }

  /** 子类可覆盖添加额外参数 */
  protected appendExtraParams(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: URLSearchParams,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: OembedOptions,
  ): void {
    // 默认不添加额外参数
  }

  /** 标准化响应数据 */
  protected normalizeResponse(data: OembedData): OembedData {
    return {
      ...data,
      version: '1.0',
    };
  }

  /** 处理错误响应 */
  private handleErrorResponse(status: number, url: string): never {
    switch (status) {
      case 404:
        throw new NotFoundError(url);
      case 429:
        throw new RateLimitedError();
      default:
        throw new ProviderError(this.name, `HTTP ${status}`, status);
    }
  }
}
