/**
 * [POS]: Admin endpoint for triggering bulk reindex maintenance
 * [INPUT]: API key from auth
 * [OUTPUT]: Job metadata with jobId for tracking
 */

import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { ReindexMaintenanceService } from './reindex-maintenance.service';

@ApiTags('sources')
@Controller({ path: 'sources', version: '1' })
export class ReindexMaintenanceController {
  constructor(
    private readonly reindexService: ReindexMaintenanceService,
  ) {}

  @Post('reindex-all')
  @Public()
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('apiKey')
  @ApiOperation({ summary: 'Trigger bulk reindex of all active sources' })
  async triggerReindex(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
  ) {
    const result = await this.reindexService.startJob(apiKey.apiKeyId);
    return {
      job_id: result.jobId,
      api_key_id: result.apiKeyId,
      total_source_count: result.totalSourceCount,
      started_at: result.startedAt,
    };
  }
}
