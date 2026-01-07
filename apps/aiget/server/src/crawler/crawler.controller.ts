/**
 * [INPUT]: CrawlOptionsDto via POST /v1/crawl, API key auth
 * [OUTPUT]: CrawlJobDto - Job ID for status polling
 * [POS]: Public API controller for multi-page crawling
 *
 * [PROTOCOL]: When this file changes, update this header and src/crawler/CLAUDE.md
 */
import {
  Controller,
  Post,
  Get,
  Delete,
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
import { CrawlerService } from './crawler.service';
import { CrawlOptionsSchema } from './dto/crawl.dto';
import {
  ZodValidationPipe,
  historyQuerySchema,
  type HistoryQuery,
} from '../common';
import { CurrentUser, Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import type { CurrentUserDto } from '../types';

@ApiTags('Crawl')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'crawl', version: '1' })
@UseGuards(ApiKeyGuard)
export class CrawlerController {
  constructor(private crawlerService: CrawlerService) {}

  @Post()
  @ApiOperation({ summary: 'Start a crawl job' })
  @ApiOkResponse({ description: 'Crawl job created' })
  async startCrawl(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(CrawlOptionsSchema)) options: unknown,
  ) {
    const job = await this.crawlerService.startCrawl(
      user.id,
      options as Parameters<typeof this.crawlerService.startCrawl>[1],
    );

    return {
      id: job.id,
      status: job.status,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crawl job status' })
  @ApiParam({ name: 'id', description: 'Crawl job ID' })
  @ApiOkResponse({ description: 'Crawl job status and results' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async getStatus(@Param('id') id: string) {
    const status = await this.crawlerService.getStatus(id);

    if (!status) {
      throw new NotFoundException('Crawl job not found');
    }

    return status;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a crawl job' })
  @ApiParam({ name: 'id', description: 'Crawl job ID' })
  @ApiOkResponse({ description: 'Crawl job cancelled' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async cancelCrawl(@Param('id') id: string) {
    // Verify job exists before cancelling
    const job = await this.crawlerService.getStatus(id);
    if (!job) {
      throw new NotFoundException('Crawl job not found');
    }

    await this.crawlerService.cancelCrawl(id);

    return {
      id,
      status: 'CANCELLED',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get crawl history' })
  @ApiQuery({
    name: 'limit',
    description: 'Max results (1-100)',
    required: false,
  })
  @ApiQuery({ name: 'offset', description: 'Offset', required: false })
  @ApiOkResponse({ description: 'List of crawl jobs' })
  async getHistory(
    @CurrentUser() user: CurrentUserDto,
    @Query(new ZodValidationPipe(historyQuerySchema)) query: HistoryQuery,
  ) {
    return this.crawlerService.getHistory(user.id, query.limit, query.offset);
  }
}
