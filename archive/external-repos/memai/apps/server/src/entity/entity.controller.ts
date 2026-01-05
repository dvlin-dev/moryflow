/**
 * [POS]: Entity API Controller
 *
 * [INPUT]: CreateEntityDto, ListEntityQueryDto
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
  UseInterceptors,
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
  CreateEntityDto,
  CreateEntityBatchDto,
  ListEntityQueryDto,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';

@ApiTags('Entity')
@ApiSecurity('apiKey')
@Controller({ path: 'entities', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  /**
   * Create an entity
   */
  @Post()
  @ApiOperation({ summary: 'Create an entity' })
  @ApiOkResponse({ description: 'Entity created' })
  async create(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: CreateEntityDto,
  ) {
    return this.entityService.create(apiKeyId, dto);
  }

  /**
   * Batch create entities
   */
  @Post('batch')
  @ApiOperation({ summary: 'Batch create entities' })
  @ApiOkResponse({ description: 'Entities created' })
  async createMany(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: CreateEntityBatchDto,
  ) {
    return this.entityService.createMany(apiKeyId, dto);
  }

  /**
   * List entities for a user
   */
  @Get()
  @ApiOperation({ summary: 'List entities for a user' })
  @ApiOkResponse({ description: 'List of entities' })
  async list(
    @ApiKeyId() apiKeyId: string,
    @Query() query: ListEntityQueryDto,
  ) {
    return this.entityService.list(apiKeyId, query.userId, {
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
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    return this.entityService.getById(apiKeyId, id);
  }

  /**
   * Delete an entity
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an entity' })
  @ApiNoContentResponse({ description: 'Entity deleted' })
  @ApiParam({ name: 'id', description: 'Entity ID' })
  async delete(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    await this.entityService.delete(apiKeyId, id);
    return null;
  }
}
