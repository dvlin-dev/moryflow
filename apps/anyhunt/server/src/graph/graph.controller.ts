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
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { ZodValidationPipe } from '../common';
import {
  GetGraphQuerySchema,
  PathQuerySchema,
  NeighborsQuerySchema,
  TraverseSchema,
  type GetGraphQuery,
  type PathQuery,
  type NeighborsQuery,
  type TraverseInput,
} from './dto';

@ApiTags('Graph')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'graph', version: '1' })
@UseGuards(ApiKeyGuard)
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  /**
   * Get user's full knowledge graph
   */
  @Get()
  @ApiOperation({ summary: 'Get full knowledge graph' })
  @ApiOkResponse({ description: 'Full knowledge graph returned' })
  async getFullGraph(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(GetGraphQuerySchema)) query: GetGraphQuery,
  ) {
    return this.graphService.getFullGraph(apiKey.id, query.userId, {
      limit: query.limit,
    });
  }

  /**
   * Traverse graph from entity
   */
  @Post('traverse')
  @ApiOperation({ summary: 'Traverse graph from entity' })
  @ApiOkResponse({ description: 'Graph traversal result' })
  async traverse(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(TraverseSchema)) dto: TraverseInput,
  ) {
    return this.graphService.traverse(
      apiKey.id,
      dto.entityId,
      dto.options ?? {},
    );
  }

  /**
   * Find path between two entities
   */
  @Get('path')
  @ApiOperation({ summary: 'Find path between entities' })
  @ApiOkResponse({ description: 'Path between entities' })
  async findPath(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(PathQuerySchema)) query: PathQuery,
  ) {
    return this.graphService.findPath(
      apiKey.id,
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
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('entityId') entityId: string,
    @Query(new ZodValidationPipe(NeighborsQuerySchema)) query: NeighborsQuery,
  ) {
    return this.graphService.getNeighbors(apiKey.id, entityId, {
      direction: query.direction,
      relationTypes: query.relationTypes,
    });
  }
}
