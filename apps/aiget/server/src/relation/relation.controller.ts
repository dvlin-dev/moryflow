/**
 * [POS]: Relation API Controller
 *
 * [INPUT]: CreateRelationInput, ListRelationQuery
 * [OUTPUT]: Relation responses
 */

import {
  Controller,
  Get,
  Post,
  Delete,
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
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { RelationService } from './relation.service';
import {
  CreateRelationSchema,
  CreateRelationBatchSchema,
  ListRelationQuerySchema,
  type CreateRelationInput,
  type CreateRelationBatchInput,
  type ListRelationQuery,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { ZodValidationPipe } from '../common';

@ApiTags('Relation')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'relations', version: '1' })
@UseGuards(ApiKeyGuard)
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  /**
   * Create a relation
   */
  @Post()
  @ApiOperation({ summary: 'Create a relation between entities' })
  @ApiOkResponse({ description: 'Relation created' })
  async create(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(CreateRelationSchema)) dto: CreateRelationInput,
  ) {
    return this.relationService.create(apiKey.id, dto);
  }

  /**
   * Batch create relations
   */
  @Post('batch')
  @ApiOperation({ summary: 'Batch create relations' })
  @ApiOkResponse({ description: 'Relations created' })
  async createMany(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(CreateRelationBatchSchema))
    dto: CreateRelationBatchInput,
  ) {
    return this.relationService.createMany(apiKey.id, dto);
  }

  /**
   * List relations for a user
   */
  @Get()
  @ApiOperation({ summary: 'List relations for a user' })
  @ApiOkResponse({ description: 'List of relations' })
  async list(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(ListRelationQuerySchema))
    query: ListRelationQuery,
  ) {
    return this.relationService.list(apiKey.id, query.userId, {
      type: query.type,
      limit: query.limit,
      offset: query.offset,
    });
  }

  /**
   * Get relations for an entity
   */
  @Get('entity/:entityId')
  @ApiOperation({ summary: 'Get all relations for an entity' })
  @ApiOkResponse({ description: 'Relations for entity' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  async getByEntity(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('entityId') entityId: string,
  ) {
    return this.relationService.getByEntity(apiKey.id, entityId);
  }

  /**
   * Delete a relation
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a relation' })
  @ApiNoContentResponse({ description: 'Relation deleted' })
  @ApiParam({ name: 'id', description: 'Relation ID' })
  async delete(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('id') id: string,
  ) {
    await this.relationService.delete(apiKey.id, id);
    return null;
  }
}
