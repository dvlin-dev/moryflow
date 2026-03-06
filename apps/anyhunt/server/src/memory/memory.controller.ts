/**
 * [POS]: Memory API Controller (Mem0 V1 aligned)
 *
 * [INPUT]: Mem0 V1 memory DTOs (snake_case)
 * [OUTPUT]: Memory responses (project wrapper, core structure aligned)
 */

import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiParam,
  ApiHeader,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { MemoryService } from './memory.service';
import {
  CreateMemorySchema,
  SearchMemorySchema,
  ListMemoryQuerySchema,
  DeleteMemoriesQuerySchema,
  UpdateMemorySchema,
  type CreateMemoryInput,
  type SearchMemoryInput,
  type ListMemoryQuery,
  type DeleteMemoriesQuery,
  type UpdateMemoryInput,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public, CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ZodValidationPipe } from '../common';
import {
  describeCreateMemoryResponse,
  resolveMemoryRequestPath,
} from './utils/memory-http.utils';
import {
  DEFAULT_IDEMPOTENCY_TTL_SECONDS,
  IDEMPOTENCY_KEY_HEADER,
  IdempotencyExecutorService,
  IdempotencyKey,
} from '../idempotency';

@ApiTags('Memory')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'memories', version: '1' })
@UseGuards(ApiKeyGuard)
export class MemoryController {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly idempotencyExecutor: IdempotencyExecutorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add memories' })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description:
      'Required for write deduplication. Reusing the same key with the same payload returns the cached response.',
  })
  @ApiOkResponse({ description: 'Memories created' })
  @ApiBadRequestResponse({
    description: 'Validation failed or Idempotency-Key header missing',
  })
  @ApiConflictResponse({
    description:
      'Idempotency key reuse conflict or another request with the same key is still processing',
  })
  async create(
    @CurrentUser() user: CurrentUserDto,
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Req() request: Request,
    @IdempotencyKey() idempotencyKey: string,
    @Body(new ZodValidationPipe(CreateMemorySchema)) dto: CreateMemoryInput,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `${IDEMPOTENCY_KEY_HEADER} header is required`,
      });
    }

    if (!apiKey?.id) {
      throw new BadRequestException({
        code: 'API_KEY_CONTEXT_MISSING',
        message: 'Validated API key context is required',
      });
    }

    return this.idempotencyExecutor.execute({
      scope: `memox:memories:create:${apiKey.id}`,
      idempotencyKey,
      method: request.method,
      path: resolveMemoryRequestPath(request),
      requestBody: dto,
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      execute: () => this.memoryService.create(user.id, apiKey.id, dto),
      describeResponse: describeCreateMemoryResponse,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get memories' })
  @ApiOkResponse({ description: 'Memories list returned' })
  async list(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(ListMemoryQuerySchema)) query: ListMemoryQuery,
  ) {
    return this.memoryService.list(apiKey.id, query);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete memories by filter' })
  @ApiNoContentResponse({ description: 'Memories deleted' })
  async deleteByFilter(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(DeleteMemoriesQuerySchema))
    query: DeleteMemoriesQuery,
  ) {
    await this.memoryService.deleteByFilter(apiKey.id, query);
    return null;
  }

  @Post('search')
  @ApiOperation({ summary: 'Search memories' })
  @ApiOkResponse({ description: 'Search results returned' })
  async search(
    @CurrentUser() user: CurrentUserDto,
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(SearchMemorySchema)) dto: SearchMemoryInput,
  ) {
    return this.memoryService.search(user.id, apiKey.id, dto);
  }

  @Get(':memoryId')
  @ApiOperation({ summary: 'Get a memory by ID' })
  @ApiOkResponse({ description: 'Memory details' })
  @ApiParam({ name: 'memoryId', description: 'Memory ID' })
  async getById(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('memoryId') memoryId: string,
  ) {
    return this.memoryService.getById(apiKey.id, memoryId);
  }

  @Put(':memoryId')
  @ApiOperation({ summary: 'Update a memory' })
  @ApiOkResponse({ description: 'Memory updated' })
  @ApiParam({ name: 'memoryId', description: 'Memory ID' })
  async update(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('memoryId') memoryId: string,
    @Body(new ZodValidationPipe(UpdateMemorySchema)) dto: UpdateMemoryInput,
  ) {
    return this.memoryService.update(apiKey.id, memoryId, dto);
  }

  @Delete(':memoryId')
  @ApiOperation({ summary: 'Delete a memory' })
  @ApiNoContentResponse({ description: 'Memory deleted' })
  @ApiParam({ name: 'memoryId', description: 'Memory ID' })
  async delete(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('memoryId') memoryId: string,
  ) {
    await this.memoryService.delete(apiKey.id, memoryId);
    return null;
  }

  @Get(':memoryId/history')
  @ApiOperation({ summary: 'Memory history' })
  @ApiOkResponse({ description: 'Memory history returned' })
  @ApiParam({ name: 'memoryId', description: 'Memory ID' })
  async history(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('memoryId') memoryId: string,
  ) {
    return this.memoryService.history(apiKey.id, memoryId);
  }

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get memories by entity' })
  @ApiOkResponse({ description: 'Entity memories returned' })
  @ApiParam({ name: 'entityType', description: 'Entity type' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  async listByEntity(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query(new ZodValidationPipe(ListMemoryQuerySchema)) query: ListMemoryQuery,
  ) {
    return this.memoryService.listByEntity(
      apiKey.id,
      entityType,
      entityId,
      query,
    );
  }
}
