import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { ZodValidationPipe } from '../common';
import {
  type ListSourceStatusesQueryDto,
  ListSourceStatusesQuerySchema,
  SourceStatusListResponseSchema,
} from './dto';
import { SourceIngestReadService } from './source-ingest-read.service';
import { toSourceStatusItemResponse } from './sources-mappers.utils';

@ApiTags('Sources')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'source-statuses', version: '1' })
@UseGuards(ApiKeyGuard)
export class SourceStatusesController {
  constructor(private readonly readService: SourceIngestReadService) {}

  @Get()
  @ApiOperation({ summary: 'List semantic source ingest statuses' })
  @ApiOkResponse({ description: 'Source statuses returned' })
  async list(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(ListSourceStatusesQuerySchema))
    query: ListSourceStatusesQueryDto,
  ) {
    const items = await this.readService.listStatuses(
      apiKey.id,
      {
        user_id: query.user_id,
        agent_id: query.agent_id,
        app_id: query.app_id,
        run_id: query.run_id,
        org_id: query.org_id,
        project_id: query.project_id,
      },
      query.filter,
    );

    return SourceStatusListResponseSchema.parse({
      items: items.map(toSourceStatusItemResponse),
    });
  }
}
