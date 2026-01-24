/**
 * Console Playground Controller
 * Playground 代理接口（Session 认证）
 *
 * [INPUT]: apiKeyId + 各服务的请求参数
 * [OUTPUT]: 各服务的响应
 * [POS]: 供 Console 前端 Playground 使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { CurrentUserDto } from '../types';
import { ConsolePlaygroundService } from './console-playground.service';
import {
  ConsoleScrapeSchema,
  ConsoleCrawlSchema,
  ConsoleSearchSchema,
  ConsoleMapSchema,
  ConsoleExtractSchema,
  ApiKeyIdQuerySchema,
  type ConsoleScrapeDto,
  type ConsoleCrawlDto,
  type ConsoleSearchDto,
  type ConsoleMapDto,
  type ConsoleExtractDto,
  type ApiKeyIdQueryDto,
} from './dto';

@ApiTags('Console - Playground')
@ApiCookieAuth()
@Controller({ path: 'console/playground', version: '1' })
export class ConsolePlaygroundController {
  constructor(private readonly service: ConsolePlaygroundService) {}

  /**
   * Scrape 代理
   * POST /api/v1/console/playground/scrape
   */
  @Post('scrape')
  @ApiOperation({ summary: 'Scrape a URL (console proxy)' })
  @ApiOkResponse({ description: 'Scrape result' })
  async scrape(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleScrapeSchema)) dto: ConsoleScrapeDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.service.scrape(user.id, apiKeyId, options);
  }

  /**
   * Crawl 代理
   * POST /api/v1/console/playground/crawl
   */
  @Post('crawl')
  @ApiOperation({ summary: 'Start a crawl job (console proxy)' })
  @ApiOkResponse({ description: 'Crawl job started' })
  async crawl(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleCrawlSchema)) dto: ConsoleCrawlDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.service.crawl(user.id, apiKeyId, options);
  }

  /**
   * 获取 Crawl 状态
   * GET /api/v1/console/playground/crawl/:jobId?apiKeyId=xxx
   */
  @Get('crawl/:jobId')
  @ApiOperation({ summary: 'Get crawl job status (console proxy)' })
  @ApiOkResponse({ description: 'Crawl job status' })
  async getCrawlStatus(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobId') jobId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.service.getCrawlStatus(user.id, query.apiKeyId, jobId);
  }

  /**
   * 取消 Crawl 任务
   * DELETE /api/v1/console/playground/crawl/:jobId?apiKeyId=xxx
   */
  @Delete('crawl/:jobId')
  @ApiOperation({ summary: 'Cancel a crawl job (console proxy)' })
  @ApiOkResponse({ description: 'Crawl job cancelled' })
  async cancelCrawl(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobId') jobId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.service.cancelCrawl(user.id, query.apiKeyId, jobId);
  }

  /**
   * Search 代理
   * POST /api/v1/console/playground/search
   */
  @Post('search')
  @ApiOperation({ summary: 'Search the web (console proxy)' })
  @ApiOkResponse({ description: 'Search results' })
  async search(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleSearchSchema)) dto: ConsoleSearchDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.service.search(user.id, apiKeyId, options);
  }

  /**
   * Map 代理
   * POST /api/v1/console/playground/map
   */
  @Post('map')
  @ApiOperation({ summary: 'Discover URLs on a website (console proxy)' })
  @ApiOkResponse({ description: 'Map results' })
  async map(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleMapSchema)) dto: ConsoleMapDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.service.map(user.id, apiKeyId, options);
  }

  /**
   * Extract 代理
   * POST /api/v1/console/playground/extract
   */
  @Post('extract')
  @ApiOperation({ summary: 'Extract structured data (console proxy)' })
  @ApiOkResponse({ description: 'Extract results' })
  async extract(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleExtractSchema)) dto: ConsoleExtractDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.service.extract(user.id, apiKeyId, options);
  }
}
