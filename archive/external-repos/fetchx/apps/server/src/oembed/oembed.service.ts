/**
 * oEmbed 核心服务
 */
import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { OEMBED_CACHE_PREFIX } from './oembed.constants';
import type { OembedRequestDto } from './dto/oembed-request.dto';
import type { OembedSuccessResponse } from './dto/oembed-response.dto';
import { UnsupportedProviderError } from './oembed.errors';
import type { OembedData, OembedOptions } from './oembed.types';
import { ProviderFactory } from './providers';

@Injectable()
export class OembedService {
  private readonly logger = new Logger(OembedService.name);

  constructor(
    private readonly providerFactory: ProviderFactory,
    private readonly redis: RedisService,
  ) {}

  /**
   * 获取 oEmbed 数据
   */
  async fetch(request: OembedRequestDto): Promise<OembedSuccessResponse> {
    const { url, maxwidth, maxheight, theme } = request;

    // 获取匹配的 Provider
    const provider = this.providerFactory.getProvider(url);
    if (!provider) {
      throw new UnsupportedProviderError(url);
    }

    // 构建缓存 Key
    const cacheKey = this.buildCacheKey(url, { maxwidth, maxheight, theme });

    // 检查缓存
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${provider.name}: ${url}`);
      return {
        success: true,
        data: cached,
        meta: {
          provider: provider.name,
          cached: true,
        },
      };
    }

    // 从上游获取数据
    this.logger.debug(`Cache miss, fetching from ${provider.name}: ${url}`);
    const options: OembedOptions = { maxwidth, maxheight, theme };
    const data = await provider.fetch(url, options);

    // 写入缓存
    await this.setCache(cacheKey, data, provider.cacheTtlSeconds);

    return {
      success: true,
      data,
      meta: {
        provider: provider.name,
        cached: false,
      },
    };
  }

  /**
   * 构建缓存 Key
   */
  private buildCacheKey(url: string, options: OembedOptions): string {
    const normalized = JSON.stringify({
      url,
      maxwidth: options.maxwidth,
      maxheight: options.maxheight,
      theme: options.theme,
    });
    const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    return `${OEMBED_CACHE_PREFIX}${hash}`;
  }

  /**
   * 从缓存读取
   */
  private async getFromCache(key: string): Promise<OembedData | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached) as OembedData;
      }
    } catch (err) {
      this.logger.warn(`Cache read error: ${(err as Error).message}`);
    }
    return null;
  }

  /**
   * 写入缓存
   */
  private async setCache(key: string, data: OembedData, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(data), ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache write error: ${(err as Error).message}`);
    }
  }
}
