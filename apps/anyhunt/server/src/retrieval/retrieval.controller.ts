/**
 * [POS]: Retrieval public API controller
 * [INPUT]: source search / unified retrieval DTOs
 * [OUTPUT]: source-level / unified retrieval responses
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Public, CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { ZodValidationPipe } from '../common';
import { RetrievalService } from './retrieval.service';
import {
  type SearchRetrievalInputDto,
  type SearchSourcesInputDto,
  SearchRetrievalSchema,
  SearchSourcesSchema,
} from './dto';

@ApiTags('Retrieval')
@ApiSecurity('apiKey')
@Public()
@Controller({ version: '1' })
@UseGuards(ApiKeyGuard)
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('sources/search')
  @ApiOperation({ summary: 'Search source documents and aggregate by source' })
  @ApiOkResponse({ description: 'Source search results returned' })
  async searchSources(
    @CurrentUser() user: CurrentUserDto,
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(SearchSourcesSchema))
    dto: SearchSourcesInputDto,
  ) {
    return this.retrievalService.searchSources(user.id, apiKey.id, dto);
  }

  @Post('retrieval/search')
  @ApiOperation({ summary: 'Search across memory facts and sources' })
  @ApiOkResponse({ description: 'Unified retrieval results returned' })
  async search(
    @CurrentUser() user: CurrentUserDto,
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(SearchRetrievalSchema))
    dto: SearchRetrievalInputDto,
  ) {
    return this.retrievalService.search(user.id, apiKey.id, dto);
  }
}
