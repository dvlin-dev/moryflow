/**
 * [POS]: Entity API Controller
 *
 * [INPUT]: CreateEntityInput, ListEntityQuery
 * [OUTPUT]: Entity responses
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
import { EntityService } from './entity.service';
import {
  CreateEntitySchema,
  CreateEntityBatchSchema,
  ListEntityQuerySchema,
  type CreateEntityInput,
  type CreateEntityBatchInput,
  type ListEntityQuery,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { ZodValidationPipe } from '../common';

@ApiTags('Entity')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'entities', version: '1' })
@UseGuards(ApiKeyGuard)
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  /**
   * Create an entity
   */
  @Post()
  @ApiOperation({ summary: 'Create an entity' })
  @ApiOkResponse({ description: 'Entity created' })
  async create(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(CreateEntitySchema)) dto: CreateEntityInput,
  ) {
    return this.entityService.create(apiKey.id, dto);
  }

  /**
   * Batch create entities
   */
  @Post('batch')
  @ApiOperation({ summary: 'Batch create entities' })
  @ApiOkResponse({ description: 'Entities created' })
  async createMany(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(CreateEntityBatchSchema))
    dto: CreateEntityBatchInput,
  ) {
    return this.entityService.createMany(apiKey.id, dto);
  }

  /**
   * List entities for a user
   */
  @Get()
  @ApiOperation({ summary: 'List entities for a user' })
  @ApiOkResponse({ description: 'List of entities' })
  async list(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(ListEntityQuerySchema)) query: ListEntityQuery,
  ) {
    return this.entityService.list(apiKey.id, query.userId, {
      type: query.type,
      limit: query.limit,
      offset: query.offset,
    });
  }

  /**
   * Get an entity by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get an entity by ID' })
  @ApiOkResponse({ description: 'Entity details' })
  @ApiParam({ name: 'id', description: 'Entity ID' })
  async getById(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('id') id: string,
  ) {
    return this.entityService.getById(apiKey.id, id);
  }

  /**
   * Delete an entity
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an entity' })
  @ApiNoContentResponse({ description: 'Entity deleted' })
  @ApiParam({ name: 'id', description: 'Entity ID' })
  async delete(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('id') id: string,
  ) {
    await this.entityService.delete(apiKey.id, id);
    return null;
  }
}
