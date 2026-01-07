/**
 * [INPUT]: ScrapeOptionsDto via POST /v1/scrape, API key auth
 * [OUTPUT]: ScrapeResponseDto - Job result or cached content
 * [POS]: Public API controller for scraping, validates input and delegates to service
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ScraperService } from './scraper.service';
import { ScrapeOptionsSchema } from './dto/scrape.dto';
import {
  ZodValidationPipe,
  historyQuerySchema,
  type HistoryQuery,
} from '../common';
import { CurrentUser, Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { CurrentUserDto } from '../types';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';

@ApiTags('Scrape')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'scrape', version: '1' })
@UseGuards(ApiKeyGuard)
export class ScraperController {
  constructor(private scraperService: ScraperService) {}

  @Post()
  @ApiOperation({ summary: 'Scrape a URL' })
  @ApiOkResponse({
    description: 'Scrape job created or cached result returned',
  })
  async scrape(
    @CurrentUser() user: CurrentUserDto,
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(ScrapeOptionsSchema)) options: unknown,
  ) {
    const job = await this.scraperService.scrape(
      user.id,
      options as Parameters<typeof this.scraperService.scrape>[1],
      apiKey.id,
    );

    // 如果是缓存命中，直接返回完整结果
    if ('fromCache' in job && job.fromCache) {
      return {
        id: job.id,
        url: job.url,
        fromCache: true,
        ...((job.result as Record<string, unknown>) || {}),
        screenshot:
          job.screenshotUrl || job.screenshotBase64
            ? {
                url: job.screenshotUrl,
                base64: job.screenshotBase64,
                width: job.screenshotWidth,
                height: job.screenshotHeight,
                format: job.screenshotFormat,
                fileSize: job.screenshotFileSize,
                expiresAt: job.screenshotExpiresAt?.toISOString(),
              }
            : undefined,
      };
    }

    // 否则返回任务 ID，客户端轮询获取结果
    return {
      id: job.id,
      status: job.status,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scrape job status' })
  @ApiParam({ name: 'id', description: 'Scrape job ID' })
  @ApiOkResponse({ description: 'Scrape job status and result' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async getStatus(@Param('id') id: string) {
    const job = await this.scraperService.getStatus(id);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      url: job.url,
      status: job.status,
      fromCache: job.fromCache,
      // 只有完成时才返回结果
      ...(job.status === 'COMPLETED' && {
        ...((job.result as Record<string, unknown>) || {}),
        screenshot:
          job.screenshotUrl || job.screenshotBase64
            ? {
                url: job.screenshotUrl,
                base64: job.screenshotBase64,
                width: job.screenshotWidth,
                height: job.screenshotHeight,
                format: job.screenshotFormat,
                fileSize: job.screenshotFileSize,
                expiresAt: job.screenshotExpiresAt?.toISOString(),
              }
            : undefined,
        timings: {
          queueWaitMs: job.queueWaitMs,
          fetchMs: job.fetchMs,
          renderMs: job.renderMs,
          transformMs: job.transformMs,
          screenshotMs: job.screenshotMs,
          totalMs: job.totalMs,
        },
      }),
      // 失败时返回错误信息
      ...(job.status === 'FAILED' && {
        error: {
          code: job.errorCode,
          message: job.error,
        },
      }),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get scrape history' })
  @ApiQuery({
    name: 'limit',
    description: 'Max results (1-100)',
    required: false,
  })
  @ApiQuery({ name: 'offset', description: 'Offset', required: false })
  @ApiOkResponse({ description: 'List of scrape jobs' })
  async getHistory(
    @CurrentUser() user: CurrentUserDto,
    @Query(new ZodValidationPipe(historyQuerySchema)) query: HistoryQuery,
  ) {
    const jobs = await this.scraperService.getHistory(
      user.id,
      query.limit,
      query.offset,
    );

    return jobs.map((job) => ({
      id: job.id,
      url: job.url,
      status: job.status,
      fromCache: job.fromCache,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    }));
  }
}
