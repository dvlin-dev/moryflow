import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  GraphRebuildStatusSchema,
  GraphRebuildTriggerSchema,
  type GraphRebuildTriggerInputDto,
} from './dto/graph.schema';
import { GraphRebuildService } from './graph-rebuild.service';
import { parseGraphScopeQuery } from './utils/graph-scope-query.utils';

@ApiTags('Graph')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'graph', version: '1' })
@UseGuards(ApiKeyGuard)
export class GraphRebuildController {
  constructor(private readonly graphRebuildService: GraphRebuildService) {}

  @Post('rebuild')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start graph scope rebuild' })
  @ApiOkResponse({
    description: 'Graph scope rebuild status returned',
    schema: zodSchemaToOpenApiSchema(GraphRebuildStatusSchema),
  })
  async startRebuild(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(GraphRebuildTriggerSchema))
    dto: GraphRebuildTriggerInputDto,
  ) {
    return this.graphRebuildService.startRebuild(apiKey.id, dto);
  }

  @Get('rebuild/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get graph scope rebuild status' })
  @ApiOkResponse({
    description: 'Graph scope rebuild status returned',
    schema: zodSchemaToOpenApiSchema(GraphRebuildStatusSchema),
  })
  async getStatus(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query() query: Record<string, unknown>,
  ) {
    const scope = parseGraphScopeQuery(query);
    return this.graphRebuildService.getStatus(apiKey.id, scope.project_id);
  }
}
