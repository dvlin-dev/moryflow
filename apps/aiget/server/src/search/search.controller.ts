/**
 * [INPUT]: SearchOptionsDto - Query, filters, and scrape options
 * [OUTPUT]: SearchResponse - Search results with optional page content
 * [POS]: Public API controller for web search operations
 *
 * [PROTOCOL]: When this file changes, update this header and src/search/CLAUDE.md
 */
import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchOptionsSchema } from './dto/search.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import type { CurrentUserDto } from '../types';

@ApiTags('Search')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'search', version: '1' })
@UseGuards(ApiKeyGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: 'Search the web' })
  @ApiOkResponse({ description: 'Search results' })
  async search(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(SearchOptionsSchema)) options: unknown,
  ) {
    return this.searchService.search(
      user.id,
      options as Parameters<typeof this.searchService.search>[1],
    );
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Get search autocomplete suggestions' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiOkResponse({ description: 'Autocomplete suggestions' })
  async autocomplete(@Query('q') query: string) {
    if (!query) {
      return { suggestions: [] };
    }

    const suggestions = await this.searchService.getAutocomplete(query);
    return { suggestions };
  }
}
