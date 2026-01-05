/**
 * [POS]: Relation API Controller
 *
 * [INPUT]: CreateRelationDto, ListRelationQueryDto
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
import { RelationService } from './relation.service';
import {
  CreateRelationDto,
  CreateRelationBatchDto,
  ListRelationQueryDto,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';

@ApiTags('Relation')
@ApiSecurity('apiKey')
@Controller({ path: 'relations', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  /**
   * Create a relation
   */
  @Post()
  @ApiOperation({ summary: 'Create a relation between entities' })
  @ApiOkResponse({ description: 'Relation created' })
  async create(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: CreateRelationDto,
  ) {
    return this.relationService.create(apiKeyId, dto);
  }

  /**
   * Batch create relations
   */
  @Post('batch')
  @ApiOperation({ summary: 'Batch create relations' })
  @ApiOkResponse({ description: 'Relations created' })
  async createMany(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: CreateRelationBatchDto,
  ) {
    return this.relationService.createMany(apiKeyId, dto);
  }

  /**
   * List relations for a user
   */
  @Get()
  @ApiOperation({ summary: 'List relations for a user' })
  @ApiOkResponse({ description: 'List of relations' })
  async list(
    @ApiKeyId() apiKeyId: string,
    @Query() query: ListRelationQueryDto,
  ) {
    return this.relationService.list(apiKeyId, query.userId, {
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
    @ApiKeyId() apiKeyId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.relationService.getByEntity(apiKeyId, entityId);
  }

  /**
   * Delete a relation
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a relation' })
  @ApiNoContentResponse({ description: 'Relation deleted' })
  @ApiParam({ name: 'id', description: 'Relation ID' })
  async delete(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    await this.relationService.delete(apiKeyId, id);
    return null;
  }
}
