/**
 * [POS]: Entity API Controller (Mem0 aligned)
 *
 * [INPUT]: Mem0 entity DTOs
 * [OUTPUT]: Mem0 entity responses
 */

import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { EntityService } from './entity.service';
import {
  CreateUserSchema,
  CreateAgentSchema,
  CreateAppSchema,
  CreateRunSchema,
  ListEntitiesQuerySchema,
  type CreateUserInput,
  type CreateAgentInput,
  type CreateAppInput,
  type CreateRunInput,
  type ListEntitiesQuery,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { ZodValidationPipe } from '../common';

@ApiTags('Entities')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: '', version: '1' })
@UseGuards(ApiKeyGuard)
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @Get('entities')
  @ApiOperation({ summary: 'List entities' })
  @ApiOkResponse({ description: 'Entities list returned' })
  async listEntities(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Query(new ZodValidationPipe(ListEntitiesQuerySchema))
    query: ListEntitiesQuery,
  ) {
    return this.entityService.listEntities(apiKey.id, query);
  }

  @Get('entities/filters')
  @ApiOperation({ summary: 'List entity filters' })
  @ApiOkResponse({ description: 'Entity filters returned' })
  async listEntityFilters(@CurrentApiKey() apiKey: ApiKeyValidationResult) {
    return this.entityService.listEntityFilters(apiKey.id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create user entity' })
  @ApiCreatedResponse({ description: 'User created' })
  async createUser(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserInput,
  ) {
    return this.entityService.createUser(apiKey.id, dto);
  }

  @Post('agents')
  @ApiOperation({ summary: 'Create agent entity' })
  @ApiCreatedResponse({ description: 'Agent created' })
  async createAgent(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(CreateAgentSchema)) dto: CreateAgentInput,
  ) {
    return this.entityService.createAgent(apiKey.id, dto);
  }

  @Post('apps')
  @ApiOperation({ summary: 'Create app entity' })
  @ApiCreatedResponse({ description: 'App created' })
  async createApp(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(CreateAppSchema)) dto: CreateAppInput,
  ) {
    return this.entityService.createApp(apiKey.id, dto);
  }

  @Post('runs')
  @ApiOperation({ summary: 'Create run entity' })
  @ApiCreatedResponse({ description: 'Run created' })
  async createRun(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(CreateRunSchema)) dto: CreateRunInput,
  ) {
    return this.entityService.createRun(apiKey.id, dto);
  }
}
