/**
 * Console Playground Service
 * 验证 apiKeyId 所有权，代理请求到实际服务
 *
 * [INPUT]: apiKeyId + 各服务的请求参数
 * [OUTPUT]: 各服务的响应
 * [POS]: 供 console-playground.controller.ts 使用
 */

import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperService } from '../scraper/scraper.service';
import { CrawlerService } from '../crawler/crawler.service';
import { SearchService } from '../search/search.service';
import { MapService } from '../map/map.service';
import { ExtractService } from '../extract/extract.service';
import type { ScrapeOptions } from '../scraper/dto/scrape.dto';
import type { CrawlOptions } from '../crawler/dto/crawl.dto';
import type { SearchOptions } from '../search/dto/search.dto';
import type { MapOptions } from '../map/dto/map.dto';
import type { ExtractOptions } from '../extract/dto/extract.dto';

@Injectable()
export class ConsolePlaygroundService {
  private readonly logger = new Logger(ConsolePlaygroundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperService: ScraperService,
    private readonly crawlerService: CrawlerService,
    private readonly searchService: SearchService,
    private readonly mapService: MapService,
    private readonly extractService: ExtractService,
  ) {}

  /**
   * 验证 apiKeyId 属于当前用户
   * @returns userId (用于计费)
   */
  private async validateApiKeyOwnership(
    userId: string,
    apiKeyId: string,
  ): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId,
      },
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (!apiKey.isActive) {
      throw new ForbiddenException('API key is inactive');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new ForbiddenException('API key has expired');
    }
  }

  /**
   * Scrape 代理
   */
  async scrape(userId: string, apiKeyId: string, options: ScrapeOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console scrape: user=${userId}, apiKey=${apiKeyId}`);
    return this.scraperService.scrape(userId, options);
  }

  /**
   * Crawl 代理
   */
  async crawl(userId: string, apiKeyId: string, options: CrawlOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console crawl: user=${userId}, apiKey=${apiKeyId}`);
    return this.crawlerService.startCrawl(userId, options);
  }

  /**
   * 获取 Crawl 状态
   */
  async getCrawlStatus(userId: string, apiKeyId: string, jobId: string) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.crawlerService.getStatus(jobId);
  }

  /**
   * 取消 Crawl 任务
   */
  async cancelCrawl(userId: string, apiKeyId: string, jobId: string) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.crawlerService.cancelCrawl(jobId);
  }

  /**
   * Search 代理
   */
  async search(userId: string, apiKeyId: string, options: SearchOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console search: user=${userId}, apiKey=${apiKeyId}`);
    return this.searchService.search(userId, options);
  }

  /**
   * Map 代理
   */
  async map(userId: string, apiKeyId: string, options: MapOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console map: user=${userId}, apiKey=${apiKeyId}`);
    return this.mapService.map(userId, options);
  }

  /**
   * Extract 代理
   */
  async extract(userId: string, apiKeyId: string, options: ExtractOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console extract: user=${userId}, apiKey=${apiKeyId}`);
    return this.extractService.extract(userId, options);
  }
}
