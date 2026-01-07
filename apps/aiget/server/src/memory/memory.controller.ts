/**
 * [POS]: Memory API Controller
 *
 * [INPUT]: CreateMemoryInput, SearchMemoryInput, ListMemoryQuery
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
  CreateMemorySchema,
  SearchMemorySchema,
  ListMemoryQuerySchema,
  type CreateMemoryInput,
  type SearchMemoryInput,
  type ListMemoryQuery,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public, CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ZodValidationPipe } from '../common';

@ApiTags('Memory')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'memories', version: '1' })
@UseGuards(ApiKeyGuard)
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  /**
   * Create a new memory
   */
  @Post()
  @ApiOperation({ summary: 'Create a memory' })
  @ApiOkResponse({ description: 'Memory created successfully' })
  async create(
    @CurrentUser() user: CurrentUserDto,
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(CreateMemorySchema)) dto: CreateMemoryInput,
  ) {
    return this.memoryService.create(user.id, apiKey.id, dto);
  }

  /**
   * Semantic search memories
   */
  @Post('search')
  @ApiOperation({ summary: 'Search memories by semantic similarity' })
  @ApiOkResponse({ description: 'Search results returned' })
  async search(
    @CurrentUser() user: CurrentUserDto,
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(SearchMemorySchema)) dto: SearchMemoryInput,
  ) {
    return this.memoryService.search(user.id, apiKey.id, dto);
  }

  /**
   * List memories for a user
   */
  @Get()
  @ApiOperation({ summary: 'List memories for a user' })
  @ApiOkResponse({ description: 'List of memories' })
  async list(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(ListMemoryQuerySchema)) query: ListMemoryQuery,
  ) {
    return this.memoryService.list(apiKey.id, query.userId, {
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
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('id') id: string,
  ) {
    return this.memoryService.getById(apiKey.id, id);
  }

  /**
   * Delete a memory by ID
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a memory' })
  @ApiNoContentResponse({ description: 'Memory deleted' })
  @ApiParam({ name: 'id', description: 'Memory ID' })
  async delete(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('id') id: string,
  ) {
    await this.memoryService.delete(apiKey.id, id);
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
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('userId') userId: string,
  ) {
    await this.memoryService.deleteByUser(apiKey.id, userId);
    return null;
  }
}
