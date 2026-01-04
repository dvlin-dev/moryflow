/**
 * Search Controller
 * 语义搜索 API
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { SearchService } from './search.service';
import {
  SearchSchema,
  type SearchDto,
  type SearchResponseDto,
} from './dto/search.dto';
import type { AuthenticatedRequest } from '../types';

@ApiTags('search')
@Controller('api/search')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: '语义搜索' })
  async search(
    @Req() req: AuthenticatedRequest,
    @Body() body: SearchDto,
  ): Promise<SearchResponseDto> {
    const parsed = SearchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.searchService.search(req.user.id, parsed.data);
  }
}
