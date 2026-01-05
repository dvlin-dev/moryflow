/**
 * Graph API Controller
 *
 * [INPUT]: Graph traversal and query requests
 * [OUTPUT]: Graph nodes and relationships
 * [POS]: Public API for knowledge graph operations
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import { GraphService } from './graph.service';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';
import {
  GetGraphQueryDto,
  PathQueryDto,
  NeighborsQueryDto,
  TraverseDto,
} from './dto';

@ApiTags('Graph')
@ApiSecurity('apiKey')
@Controller({ path: 'graph', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  /**
   * Get user's full knowledge graph
   */
  @Get()
  @ApiOperation({ summary: 'Get full knowledge graph' })
  @ApiOkResponse({ description: 'Full knowledge graph returned' })
  async getFullGraph(
    @ApiKeyId() apiKeyId: string,
    @Query() query: GetGraphQueryDto,
  ) {
    return this.graphService.getFullGraph(apiKeyId, query.userId, {
      limit: query.limit,
    });
  }

  /**
   * Traverse graph from entity
   */
  @Post('traverse')
  @ApiOperation({ summary: 'Traverse graph from entity' })
  @ApiOkResponse({ description: 'Graph traversal result' })
  async traverse(@ApiKeyId() apiKeyId: string, @Body() dto: TraverseDto) {
    return this.graphService.traverse(apiKeyId, dto.entityId, dto.options ?? {});
  }

  /**
   * Find path between two entities
   */
  @Get('path')
  @ApiOperation({ summary: 'Find path between entities' })
  @ApiOkResponse({ description: 'Path between entities' })
  async findPath(@ApiKeyId() apiKeyId: string, @Query() query: PathQueryDto) {
    return this.graphService.findPath(
      apiKeyId,
      query.sourceId,
      query.targetId,
      query.maxDepth,
    );
  }

  /**
   * Get entity neighbors
   */
  @Get('neighbors/:entityId')
  @ApiOperation({ summary: 'Get entity neighbors' })
  @ApiOkResponse({ description: 'Entity neighbors returned' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  async getNeighbors(
    @ApiKeyId() apiKeyId: string,
    @Param('entityId') entityId: string,
    @Query() query: NeighborsQueryDto,
  ) {
    return this.graphService.getNeighbors(apiKeyId, entityId, {
      direction: query.direction,
      relationTypes: query.relationTypes,
    });
  }
}
