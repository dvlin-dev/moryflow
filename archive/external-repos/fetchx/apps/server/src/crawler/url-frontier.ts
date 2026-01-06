// apps/server/src/crawler/url-frontier.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { minimatch } from 'minimatch';
import type { FrontierOptions } from './crawler.types';

@Injectable()
export class UrlFrontier {
  constructor(private redis: RedisService) {}

  private getSeenKey(crawlJobId: string): string {
    return `crawl:${crawlJobId}:seen`;
  }

  private getQueueKey(crawlJobId: string): string {
    return `crawl:${crawlJobId}:queue`;
  }

  /**
   * 检查 URL 是否已访问
   */
  async isSeen(crawlJobId: string, url: string): Promise<boolean> {
    const result = await this.redis.client.sismember(this.getSeenKey(crawlJobId), url);
    return result === 1;
  }

  /**
   * 标记 URL 为已访问
   */
  async markSeen(crawlJobId: string, url: string): Promise<void> {
    await this.redis.client.sadd(this.getSeenKey(crawlJobId), url);
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

      // 检查是否已访问
      if (await this.isSeen(options.crawlJobId, url)) continue;

      // 检查数量限制
      const currentCount = await this.redis.client.scard(this.getSeenKey(options.crawlJobId));
      if (currentCount >= options.limit) break;

      // 检查域名限制
      if (!this.isAllowedUrl(url, options)) continue;

      // 检查路径过滤
      if (!this.matchesPathFilters(url, options)) continue;

      // 添加到队列（使用 depth 作为 score，优先爬取浅层页面）
      await this.redis.client.zadd(
        this.getQueueKey(options.crawlJobId),
        depth,
        JSON.stringify({ url, depth }),
      );
      await this.markSeen(options.crawlJobId, url);
      addedCount++;
    }

    return addedCount;
  }

  /**
   * 获取下一个要爬取的 URL
   */
  async popNext(crawlJobId: string): Promise<{ url: string; depth: number } | null> {
    const result = await this.redis.client.zpopmin(this.getQueueKey(crawlJobId));
    if (!result || result.length === 0) return null;
    return JSON.parse(result[0]);
  }

  /**
   * 批量获取要爬取的 URL（单次 Redis 调用）
   */
  async popBatch(crawlJobId: string, count: number): Promise<Array<{ url: string; depth: number }>> {
    const result = await this.redis.client.zpopmin(this.getQueueKey(crawlJobId), count);
    if (!result || result.length === 0) return [];

    // zpopmin 返回 [member1, score1, member2, score2, ...]
    const items: Array<{ url: string; depth: number }> = [];
    for (let i = 0; i < result.length; i += 2) {
      items.push(JSON.parse(result[i]));
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
