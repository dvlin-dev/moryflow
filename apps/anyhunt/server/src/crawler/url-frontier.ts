/**
 * [PROVIDES]: URL Frontier - Redis-backed URL queue and dedupe
 * [DEPENDS]: RedisService, minimatch
 * [POS]: Crawler 的 URL 去重、队列与过滤规则
 *
 * [PROTOCOL]: When this file changes, update this header and src/crawler/CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { minimatch } from 'minimatch';
import type { FrontierOptions } from './crawler.types';

@Injectable()
export class UrlFrontier {
  constructor(private redis: RedisService) {}

  private readonly enqueueScript = `
    local seenKey = KEYS[1]
    local queueKey = KEYS[2]
    local url = ARGV[1]
    local payload = ARGV[2]
    local score = tonumber(ARGV[3])
    local limit = tonumber(ARGV[4])

    if redis.call('SISMEMBER', seenKey, url) == 1 then
      return 0
    end

    local count = redis.call('SCARD', seenKey)
    if count >= limit then
      return 0
    end

    redis.call('SADD', seenKey, url)
    redis.call('ZADD', queueKey, score, payload)
    return 1
  `;

  private getSeenKey(crawlJobId: string): string {
    return `crawl:${crawlJobId}:seen`;
  }

  private getQueueKey(crawlJobId: string): string {
    return `crawl:${crawlJobId}:queue`;
  }

  /**
   * 添加新 URL 到队列
   */
  async addUrls(
    urls: Array<{ url: string; depth: number }>,
    options: FrontierOptions,
  ): Promise<number> {
    let addedCount = 0;

    for (const { url, depth } of urls) {
      // 检查深度限制
      if (depth > options.maxDepth) continue;

      // 检查域名限制
      if (!this.isAllowedUrl(url, options)) continue;

      // 检查路径过滤
      if (!this.matchesPathFilters(url, options)) continue;

      // 添加到队列（使用 depth 作为 score，优先爬取浅层页面）
      const payload = JSON.stringify({ url, depth });
      const added = await this.tryEnqueueUrl(
        options.crawlJobId,
        url,
        payload,
        depth,
        options.limit,
      );
      if (added) {
        addedCount++;
      }
    }

    return addedCount;
  }

  /**
   * 获取下一个要爬取的 URL
   */
  async popNext(
    crawlJobId: string,
  ): Promise<{ url: string; depth: number } | null> {
    const result = await this.redis.client.zpopmin(
      this.getQueueKey(crawlJobId),
    );
    if (!result || result.length === 0) return null;

    return JSON.parse(result[0]) as { url: string; depth: number };
  }

  /**
   * 批量获取要爬取的 URL（单次 Redis 调用）
   */
  async popBatch(
    crawlJobId: string,
    count: number,
  ): Promise<Array<{ url: string; depth: number }>> {
    const result = await this.redis.client.zpopmin(
      this.getQueueKey(crawlJobId),
      count,
    );
    if (!result || result.length === 0) return [];

    // zpopmin 返回 [member1, score1, member2, score2, ...]
    const items: Array<{ url: string; depth: number }> = [];
    for (let i = 0; i < result.length; i += 2) {
      const parsed = JSON.parse(result[i]) as { url: string; depth: number };
      items.push(parsed);
    }
    return items;
  }

  /**
   * 检查是否还有待爬取的 URL
   */
  async hasMore(crawlJobId: string): Promise<boolean> {
    const count = await this.redis.client.zcard(this.getQueueKey(crawlJobId));
    return count > 0;
  }

  /**
   * 清理 Redis 数据
   */
  async cleanup(crawlJobId: string): Promise<void> {
    await this.redis.del(this.getSeenKey(crawlJobId));
    await this.redis.del(this.getQueueKey(crawlJobId));
  }

  /**
   * 原子：去重 + 限额 + 入队
   */
  private async tryEnqueueUrl(
    crawlJobId: string,
    url: string,
    payload: string,
    depth: number,
    limit: number,
  ): Promise<boolean> {
    const added = (await this.redis.client.eval(
      this.enqueueScript,
      2,
      this.getSeenKey(crawlJobId),
      this.getQueueKey(crawlJobId),
      url,
      payload,
      String(depth),
      String(limit),
    )) as number;

    return added === 1;
  }

  /**
   * 检查 URL 是否允许访问
   */
  private isAllowedUrl(url: string, options: FrontierOptions): boolean {
    try {
      const urlObj = new URL(url);

      // 只允许 http/https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // 检查外部链接
      if (!options.allowExternalLinks && urlObj.hostname !== options.baseHost) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查路径是否符合过滤规则
   */
  private matchesPathFilters(url: string, options: FrontierOptions): boolean {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // 如果设置了 includePaths，必须匹配其中之一
      if (options.includePaths.length > 0) {
        const matches = options.includePaths.some((pattern) =>
          minimatch(path, pattern),
        );
        if (!matches) return false;
      }

      // 如果设置了 excludePaths，不能匹配任何一个
      if (options.excludePaths.length > 0) {
        const excluded = options.excludePaths.some((pattern) =>
          minimatch(path, pattern),
        );
        if (excluded) return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
