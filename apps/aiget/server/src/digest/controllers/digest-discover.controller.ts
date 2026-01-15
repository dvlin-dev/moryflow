/**
 * Discover Controller
 *
 * [INPUT]: Feed 类型、数量限制
 * [OUTPUT]: Feed 内容、Featured/Trending Topics
 * [POS]: Discover 模块 Public API，无需认证
 */

import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DiscoverService } from '../services/discover.service';
import {
  DiscoverFeedQuerySchema,
  DiscoverTopicsQuerySchema,
  type DiscoverFeedQuery,
  type DiscoverTopicsQuery,
} from '../dto';

@ApiTags('Public - Discover')
@Controller({ path: 'discover', version: '1' })
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  /**
   * 获取 Discover Feed
   * GET /api/v1/discover/feed
   */
  @Get('feed')
  @Public()
  @ApiOperation({ summary: 'Get discover feed (featured or trending content)' })
  @ApiQuery({
    name: 'type',
    enum: ['featured', 'trending'],
    required: false,
    description: 'Feed type (default: featured)',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of items (default: 20, max: 50)',
  })
  @ApiOkResponse({ description: 'Feed items with topic context' })
  async getFeed(
    @Query(new ZodValidationPipe(DiscoverFeedQuerySchema))
    query: DiscoverFeedQuery,
  ) {
    const { type, limit } = query;
    const { items, generatedAt } = await this.discoverService.getFeed(
      type,
      limit,
    );

    return {
      items,
      generatedAt,
    };
  }

  /**
   * 获取 Featured Topics
   * GET /api/v1/discover/featured-topics
   */
  @Get('featured-topics')
  @Public()
  @ApiOperation({ summary: 'Get featured topics for sidebar' })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of topics (default: 5, max: 20)',
  })
  @ApiOkResponse({ description: 'Featured topics list' })
  async getFeaturedTopics(
    @Query(new ZodValidationPipe(DiscoverTopicsQuerySchema))
    query: DiscoverTopicsQuery,
  ) {
    const items = await this.discoverService.getFeaturedTopics(query.limit);

    return { items };
  }

  /**
   * 获取 Trending Topics
   * GET /api/v1/discover/trending-topics
   */
  @Get('trending-topics')
  @Public()
  @ApiOperation({ summary: 'Get trending topics' })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of topics (default: 5, max: 20)',
  })
  @ApiOkResponse({ description: 'Trending topics list with scores' })
  async getTrendingTopics(
    @Query(new ZodValidationPipe(DiscoverTopicsQuerySchema))
    query: DiscoverTopicsQuery,
  ) {
    const items = await this.discoverService.getTrendingTopics(query.limit);

    return { items };
  }
}
