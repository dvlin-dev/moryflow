/**
 * [POS]: Memory API Controller
 *
 * [INPUT]: CreateMemoryDto, SearchMemoryDto, ListMemoryQueryDto
 * [OUTPUT]: Memory responses
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
import { MemoryService } from './memory.service';
import {
  CreateMemoryDto,
  SearchMemoryDto,
  ListMemoryQueryDto,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';

@ApiTags('Memory')
@ApiSecurity('apiKey')
@Controller({ path: 'memories', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  /**
   * Create a new memory
   */
  @Post()
  @ApiOperation({ summary: 'Create a memory' })
  @ApiOkResponse({ description: 'Memory created successfully' })
  async create(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: CreateMemoryDto,
  ) {
    return this.memoryService.create(apiKeyId, dto);
  }

  /**
   * Semantic search memories
   */
  @Post('search')
  @ApiOperation({ summary: 'Search memories by semantic similarity' })
  @ApiOkResponse({ description: 'Search results returned' })
  async search(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: SearchMemoryDto,
  ) {
    return this.memoryService.search(apiKeyId, dto);
  }

  /**
   * List memories for a user
   */
  @Get()
  @ApiOperation({ summary: 'List memories for a user' })
  @ApiOkResponse({ description: 'List of memories' })
  async list(
    @ApiKeyId() apiKeyId: string,
    @Query() query: ListMemoryQueryDto,
  ) {
    return this.memoryService.list(apiKeyId, query.userId, {
      limit: query.limit,
      offset: query.offset,
      agentId: query.agentId,
      sessionId: query.sessionId,
    });
  }

  /**
   * Get a single memory by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a memory by ID' })
  @ApiOkResponse({ description: 'Memory details' })
  @ApiParam({ name: 'id', description: 'Memory ID' })
  async getById(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    return this.memoryService.getById(apiKeyId, id);
  }

  /**
   * Delete a memory by ID
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a memory' })
  @ApiNoContentResponse({ description: 'Memory deleted' })
  @ApiParam({ name: 'id', description: 'Memory ID' })
  async delete(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    await this.memoryService.delete(apiKeyId, id);
    return null;
  }

  /**
   * Delete all memories for a user
   */
  @Delete('user/:userId')
  @ApiOperation({ summary: 'Delete all memories for a user' })
  @ApiNoContentResponse({ description: 'All user memories deleted' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async deleteByUser(
    @ApiKeyId() apiKeyId: string,
    @Param('userId') userId: string,
  ) {
    await this.memoryService.deleteByUser(apiKeyId, userId);
    return null;
  }
}
