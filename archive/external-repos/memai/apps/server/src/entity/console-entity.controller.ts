/**
 * Console Entity Controller
 * Entity 管理接口（控制台使用，Session 认证）
 */

import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { EntityService } from './entity.service';
import { parsePaginationParams } from '../common/utils';

@ApiTags('Console - Entity')
@ApiCookieAuth()
@Controller({ path: 'console/entities', version: VERSION_NEUTRAL })
export class ConsoleEntityController {
  constructor(private readonly entityService: EntityService) {}

  /**
   * 获取所有 Entities
   * GET /api/console/entities
   */
  @Get()
  @ApiOperation({ summary: 'List all entities' })
  @ApiOkResponse({ description: 'List of entities' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'apiKeyId', required: false, description: 'Filter by API Key ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit (default: 20, max: 100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset (default: 0)' })
  async findAll(
    @CurrentUser() user: CurrentUserDto,
    @Query('type') type?: string,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const pagination = parsePaginationParams(limit, offset);

    const result = await this.entityService.listByUser(user.id, {
      type,
      apiKeyId,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      items: result.entities,
      pagination: {
        total: result.total,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    };
  }

  /**
   * 获取所有 Entity 类型
   * GET /api/console/entities/types
   */
  @Get('types')
  @ApiOperation({ summary: 'Get all entity types' })
  @ApiOkResponse({ description: 'List of entity types' })
  async getTypes(@CurrentUser() user: CurrentUserDto) {
    return this.entityService.getTypesByUser(user.id);
  }

  /**
   * 删除 Entity
   * DELETE /api/console/entities/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an entity' })
  @ApiNoContentResponse({ description: 'Entity deleted' })
  @ApiParam({ name: 'id', description: 'Entity ID' })
  async delete(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.entityService.deleteByUser(user.id, id);
  }
}
