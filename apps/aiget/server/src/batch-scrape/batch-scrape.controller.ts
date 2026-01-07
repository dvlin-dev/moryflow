/**
 * [INPUT]: BatchScrapeOptionsDto - URLs and scrape options
 * [OUTPUT]: { id, status, totalUrls } | BatchScrapeStatus - Job info or full status
 * [POS]: Public API controller for batch scraping operations
 *
 * [PROTOCOL]: When this file changes, update this header and src/batch-scrape/CLAUDE.md
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
import { BatchScrapeService } from './batch-scrape.service';
import { BatchScrapeOptionsSchema } from './dto/batch-scrape.dto';
import {
  ZodValidationPipe,
  historyQuerySchema,
  type HistoryQuery,
} from '../common';
import { CurrentUser, Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import type { CurrentUserDto } from '../types';

@ApiTags('Batch Scrape')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'batch/scrape', version: '1' })
@UseGuards(ApiKeyGuard)
export class BatchScrapeController {
  constructor(private batchScrapeService: BatchScrapeService) {}

  @Post()
  @ApiOperation({ summary: 'Start a batch scrape job' })
  @ApiOkResponse({ description: 'Batch scrape job created' })
  async batchScrape(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(BatchScrapeOptionsSchema)) options: unknown,
  ) {
    const job = await this.batchScrapeService.batchScrape(
      user.id,
      options as Parameters<typeof this.batchScrapeService.batchScrape>[1],
    );

    return {
      id: job.id,
      status: job.status,
      totalUrls: job.totalUrls,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get batch scrape job status' })
  @ApiParam({ name: 'id', description: 'Batch scrape job ID' })
  @ApiOkResponse({ description: 'Batch scrape job status and results' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async getStatus(@Param('id') id: string) {
    const status = await this.batchScrapeService.getStatus(id);

    if (!status) {
      throw new NotFoundException('Batch scrape job not found');
    }

    return status;
  }

  @Get()
  @ApiOperation({ summary: 'Get batch scrape history' })
  @ApiQuery({
    name: 'limit',
    description: 'Max results (1-100)',
    required: false,
  })
  @ApiQuery({ name: 'offset', description: 'Offset', required: false })
  @ApiOkResponse({ description: 'List of batch scrape jobs' })
  async getHistory(
    @CurrentUser() user: CurrentUserDto,
    @Query(new ZodValidationPipe(historyQuerySchema)) query: HistoryQuery,
  ) {
    return this.batchScrapeService.getHistory(
      user.id,
      query.limit,
      query.offset,
    );
  }
}
