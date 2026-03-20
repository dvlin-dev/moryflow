/**
 * [POS]: Admin endpoint for triggering and querying bulk reindex maintenance
 * [INPUT]: API key from auth
 * [OUTPUT]: Job metadata with jobId for tracking
 */

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { ReindexMaintenanceService } from './reindex-maintenance.service';

@ApiTags('sources')
@Controller({ path: 'sources', version: '1' })
export class ReindexMaintenanceController {
  constructor(private readonly reindexService: ReindexMaintenanceService) {}

  @Post('reindex-all')
  @Public()
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('apiKey')
  @ApiOperation({
    summary:
      'Trigger bulk reindex of all active sources (per-apiKey singleton)',
  })
  async triggerReindex(@CurrentApiKey() apiKey: ApiKeyValidationResult) {
    const result = await this.reindexService.startJob(apiKey.id);
    return {
      job_id: result.jobId,
      api_key_id: result.apiKeyId,
      processed_count: result.processedCount,
      failed_count: result.failedCount,
      skipped_count: result.skippedCount,
      total_source_count: result.totalSourceCount,
      started_at: result.startedAt,
    };
  }

  @Get('reindex-all/status')
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('apiKey')
  @ApiOperation({
    summary: 'Query current reindex job status for this API key',
  })
  async getReindexStatus(@CurrentApiKey() apiKey: ApiKeyValidationResult) {
    const status = await this.reindexService.getJobStatus(apiKey.id);
    if (!status) {
      return { active: false };
    }
    return {
      active: true,
      job_id: status.jobId,
      api_key_id: status.apiKeyId,
      processed_count: status.processedCount,
      failed_count: status.failedCount,
      skipped_count: status.skippedCount,
      total_source_count: status.totalSourceCount,
      cursor: status.cursor,
      last_error: status.lastError,
      started_at: status.startedAt,
    };
  }
}
