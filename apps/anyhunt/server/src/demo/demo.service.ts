import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { ScraperService } from '../scraper/scraper.service';
import { MapService } from '../map/map.service';
import { ExtractService } from '../extract/extract.service';
import { SearchService } from '../search/search.service';
import { serverHttpJson } from '../common/http/server-http-client';
import type {
  DemoScreenshotResponse,
  DemoScrapeResponse,
  DemoMapResponse,
  DemoCrawlResponse,
  DemoExtractResponse,
  DemoSearchResponse,
} from './demo.dto';

/** 每分钟每 IP 最大请求数 */
const IP_RATE_LIMIT = 10;

/** Redis key 前缀 */
const HOURLY_KEY_PREFIX = 'demo:hourly:';

/** 已验证 IP 的 Redis key 前缀 */
const VERIFIED_IP_PREFIX = 'demo:verified:';

/** 已验证状态有效期（秒） */
const VERIFIED_TTL = 3600; // 1 小时

/** Demo 用户 ID（启动时 bootstrap 自动创建） */
const DEMO_USER_ID = 'demo-playground-user';

/**
 * Demo 服务
 * 提供官网 Playground 的截图演示功能
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly scraperService: ScraperService,
    private readonly mapService: MapService,
    private readonly extractService: ExtractService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * 获取当前小时的 Redis key（用于数据统计）
   */
  private getHourlyKey(): string {
    const hour = new Date().toISOString().slice(0, 13); // "2026-01-01T14"
    return `${HOURLY_KEY_PREFIX}${hour}`;
  }

  /**
   * 获取 IP 限流 key
   */
  private getIpKey(ip: string): string {
    const minute = new Date().toISOString().slice(0, 16); // "2026-01-01T14:30"
    return `demo:ip:${ip}:${minute}`;
  }

  /**
   * 检查 IP 限流
   * @returns true 如果允许，false 如果超限
   */
  async checkIpRateLimit(ip: string): Promise<boolean> {
    const key = this.getIpKey(ip);
    const countStr = await this.redis.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= IP_RATE_LIMIT) {
      return false;
    }

    await this.redis.incr(key);
    await this.redis.expire(key, 60);
    return true;
  }

  /**
   * 检查 IP 是否已验证
   */
  async isIpVerified(ip: string): Promise<boolean> {
    const key = `${VERIFIED_IP_PREFIX}${ip}`;
    const value = await this.redis.get(key);
    return value !== null;
  }

  /**
   * 标记 IP 为已验证
   */
  async markIpAsVerified(ip: string): Promise<void> {
    const key = `${VERIFIED_IP_PREFIX}${ip}`;
    await this.redis.set(key, '1', VERIFIED_TTL);
  }

  /**
   * 增加小时计数（用于数据统计）
   */
  async incrementHourlyCount(): Promise<void> {
    const key = this.getHourlyKey();
    await this.redis.incr(key);
    await this.redis.expire(key, 3600); // 1 小时过期
  }

  /**
   * 验证 Turnstile token
   */
  async verifyCaptcha(token: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn(
        'TURNSTILE_SECRET_KEY not configured, skipping verification',
      );
      return true;
    }

    try {
      const data = await serverHttpJson<{ success?: boolean }>({
        url: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }).toString(),
        timeoutMs: 10000,
      });
      return data.success === true;
    } catch (error) {
      this.logger.error('Turnstile verification failed', error);
      return false;
    }
  }

  /**
   * 执行演示截图
   */
  async captureScreenshot(url: string): Promise<DemoScreenshotResponse> {
    const startTime = Date.now();

    try {
      // 使用 ScraperService 进行同步截图
      const result = await this.scraperService.scrapeSync(DEMO_USER_ID, {
        url,
        formats: ['screenshot'],
        onlyMainContent: true,
        mobile: false,
        darkMode: false,
        timeout: 15000,
        screenshotOptions: {
          fullPage: false,
          format: 'png',
          quality: 80,
          response: 'base64', // 返回 base64 以便直接在前端显示
        },
      });

      const processingMs = Date.now() - startTime;

      // 提取截图数据
      const screenshot = result.screenshot;
      if (!screenshot?.base64) {
        throw new Error('Screenshot not captured');
      }

      const imageDataUrl = `data:image/png;base64,${screenshot.base64}`;

      return {
        imageDataUrl,
        processingMs,
        fileSize: screenshot.fileSize,
        width: screenshot.width,
        height: screenshot.height,
      };
    } catch (error) {
      this.logger.error('Demo screenshot failed', error);
      throw new BadRequestException({
        code: 'SCREENSHOT_FAILED',
        message:
          error instanceof Error ? error.message : 'Screenshot capture failed',
      });
    }
  }

  /**
   * 执行演示抓取
   */
  async scrape(
    url: string,
    formats: string[],
    onlyMainContent: boolean,
  ): Promise<DemoScrapeResponse> {
    const startTime = Date.now();

    try {
      const result = await this.scraperService.scrapeSync(DEMO_USER_ID, {
        url,
        formats: formats as (
          | 'markdown'
          | 'html'
          | 'rawHtml'
          | 'links'
          | 'screenshot'
          | 'pdf'
        )[],
        onlyMainContent,
        mobile: false,
        darkMode: false,
        timeout: 20000,
        screenshotOptions: formats.includes('screenshot')
          ? {
              fullPage: false,
              format: 'png',
              quality: 80,
              response: 'url', // 返回 CDN URL
            }
          : undefined,
        pdfOptions: formats.includes('pdf')
          ? {
              format: 'A4' as const,
              landscape: false,
              scale: 1,
              printBackground: true,
            }
          : undefined,
      });

      const processingMs = Date.now() - startTime;

      return {
        markdown: result.markdown,
        html: result.html,
        rawHtml: result.rawHtml,
        links: result.links,
        screenshot: result.screenshot
          ? {
              url: result.screenshot.url,
              width: result.screenshot.width,
              height: result.screenshot.height,
            }
          : undefined,
        pdf: result.pdf
          ? {
              url: result.pdf.url,
              pageCount: result.pdf.pageCount,
              fileSize: result.pdf.fileSize,
            }
          : undefined,
        metadata: result.metadata
          ? {
              title: result.metadata.title,
              description: result.metadata.description,
              ogImage: result.metadata.ogImage,
              favicon: result.metadata.favicon,
            }
          : undefined,
        processingMs,
        fromCache: result.fromCache,
      };
    } catch (error) {
      this.logger.error('Demo scrape failed', error);
      throw new BadRequestException({
        code: 'SCRAPE_FAILED',
        message: error instanceof Error ? error.message : 'Scrape failed',
      });
    }
  }

  /**
   * 执行演示 Map
   */
  async map(
    url: string,
    search?: string,
    includeSubdomains?: boolean,
  ): Promise<DemoMapResponse> {
    const startTime = Date.now();

    try {
      const result = await this.mapService.map(DEMO_USER_ID, {
        url,
        search,
        includeSubdomains: includeSubdomains ?? false,
        ignoreSitemap: false,
        limit: 20, // Demo 限制最多 20 条
      });

      const processingMs = Date.now() - startTime;

      return {
        links: result.links,
        count: result.count,
        processingMs,
      };
    } catch (error) {
      this.logger.error('Demo map failed', error);
      throw new BadRequestException({
        code: 'MAP_FAILED',
        message: error instanceof Error ? error.message : 'Map failed',
      });
    }
  }

  /**
   * 执行演示 Crawl（简化版，同步返回）
   */
  async crawl(
    url: string,
    maxDepth: number,
    limit: number,
  ): Promise<DemoCrawlResponse> {
    const startTime = Date.now();

    try {
      // 先获取 Map 来发现 URL
      const mapResult = await this.mapService.map(DEMO_USER_ID, {
        url,
        limit: limit,
        includeSubdomains: false,
        ignoreSitemap: false,
      });

      // 对每个 URL 进行 scrape（限制数量）
      const urlsToScrape = mapResult.links.slice(0, limit);
      const pages: DemoCrawlResponse['pages'] = [];

      for (const pageUrl of urlsToScrape) {
        try {
          const scrapeResult = await this.scraperService.scrapeSync(
            DEMO_USER_ID,
            {
              url: pageUrl,
              formats: ['markdown'],
              onlyMainContent: true,
              mobile: false,
              darkMode: false,
              timeout: 10000,
            },
          );

          pages.push({
            url: pageUrl,
            depth: pageUrl === url ? 0 : 1,
            markdown: scrapeResult.markdown?.slice(0, 1000), // 限制长度
            metadata: scrapeResult.metadata
              ? {
                  title: scrapeResult.metadata.title,
                  description: scrapeResult.metadata.description,
                }
              : undefined,
          });
        } catch {
          // 单个页面失败不影响整体
          pages.push({
            url: pageUrl,
            depth: pageUrl === url ? 0 : 1,
          });
        }
      }

      const processingMs = Date.now() - startTime;

      return {
        pages,
        totalUrls: mapResult.count,
        completedUrls: pages.length,
        processingMs,
      };
    } catch (error) {
      this.logger.error('Demo crawl failed', error);
      throw new BadRequestException({
        code: 'CRAWL_FAILED',
        message: error instanceof Error ? error.message : 'Crawl failed',
      });
    }
  }

  /**
   * 执行演示 Extract
   */
  async extract(
    url: string,
    prompt: string,
    schema?: Record<string, unknown>,
  ): Promise<DemoExtractResponse> {
    const startTime = Date.now();

    try {
      const result = await this.extractService.extract(DEMO_USER_ID, {
        urls: [url],
        prompt,
        schema,
      });

      const processingMs = Date.now() - startTime;

      return {
        data: result.results[0]?.data,
        processingMs,
      };
    } catch (error) {
      this.logger.error('Demo extract failed', error);
      throw new BadRequestException({
        code: 'EXTRACT_FAILED',
        message: error instanceof Error ? error.message : 'Extract failed',
      });
    }
  }

  /**
   * 执行演示 Search
   */
  async search(query: string, limit: number): Promise<DemoSearchResponse> {
    const startTime = Date.now();

    try {
      const result = await this.searchService.search(DEMO_USER_ID, {
        query,
        limit,
        scrapeResults: false, // Demo 不抓取结果内容
      });

      const processingMs = Date.now() - startTime;

      return {
        results: result.results.map((r) => ({
          title: r.title,
          url: r.url,
          description: r.content || r.description,
        })),
        query: result.query,
        processingMs,
      };
    } catch (error) {
      this.logger.error('Demo search failed', error);
      throw new BadRequestException({
        code: 'SEARCH_FAILED',
        message: error instanceof Error ? error.message : 'Search failed',
      });
    }
  }
}
