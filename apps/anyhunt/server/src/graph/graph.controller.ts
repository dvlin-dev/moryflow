import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { zodSchemaToOpenApiSchema, ZodValidationPipe } from '../common';
import {
  GraphEntityDetailResponseSchema,
  GraphOverviewResponseSchema,
  GraphQuerySchema,
  GraphQueryResponseSchema,
  type GraphQueryInputDto,
  GraphScopeSchema,
} from './dto/graph.schema';
import { GraphOverviewService } from './graph-overview.service';
import { GraphQueryService } from './graph-query.service';

@ApiTags('Graph')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'graph', version: '1' })
@UseGuards(ApiKeyGuard)
export class GraphController {
  constructor(
    private readonly graphOverviewService: GraphOverviewService,
    private readonly graphQueryService: GraphQueryService,
  ) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get graph overview' })
  @ApiOkResponse({
    description: 'Graph overview returned',
    schema: zodSchemaToOpenApiSchema(GraphOverviewResponseSchema),
  })
  async getOverview(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(GraphScopeSchema))
    scope: GraphQueryInputDto['scope'],
  ) {
    return this.graphOverviewService.getOverview(apiKey.id, scope);
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query graph entities and relations' })
  @ApiOkResponse({
    description: 'Graph query results returned',
    schema: zodSchemaToOpenApiSchema(GraphQueryResponseSchema),
  })
  async query(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(GraphQuerySchema))
    dto: GraphQueryInputDto,
  ) {
    return this.graphQueryService.query(apiKey.id, dto);
  }

  @Get('entities/:entityId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get graph entity detail' })
  @ApiOkResponse({
    description: 'Graph entity detail returned',
    schema: zodSchemaToOpenApiSchema(GraphEntityDetailResponseSchema),
  })
  async getEntityDetail(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('entityId') entityId: string,
    @Query(new ZodValidationPipe(GraphScopeSchema))
    scope: GraphQueryInputDto['scope'],
  ) {
    return this.graphQueryService.getEntityDetail(apiKey.id, entityId, scope);
  }
}
