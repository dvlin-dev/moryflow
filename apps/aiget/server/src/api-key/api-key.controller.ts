/**
 * API Key Controller
 *
 * [INPUT]: API Key CRUD 请求
 * [OUTPUT]: API Key 数据
 * [POS]: 控制台 API Key 管理接口（Session 认证）
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { CurrentUserDto } from '../types';
import { ApiKeyService } from './api-key.service';
import {
  createApiKeySchema,
  updateApiKeySchema,
  type CreateApiKeyDto,
  type UpdateApiKeyDto,
} from './dto';

@ApiTags('ApiKey')
@ApiSecurity('session')
@Controller({ path: 'console/api-keys', version: '1' })
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Create a new API key
   * POST /api/v1/console/api-keys
   */
  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiCreatedResponse({ description: 'API key created successfully' })
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(createApiKeySchema)) dto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.create(user.id, dto);
  }

  /**
   * List all API keys for current user
   * GET /api/v1/console/api-keys
   */
  @Get()
  @ApiOperation({ summary: 'List all API keys for current user' })
  @ApiOkResponse({ description: 'Successfully returned API keys list' })
  async findAll(@CurrentUser() user: CurrentUserDto) {
    return this.apiKeyService.findAllByUser(user.id);
  }

  /**
   * Get a single API key
   * GET /api/v1/console/api-keys/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiOkResponse({ description: 'Successfully returned API key' })
  @ApiNotFoundResponse({ description: 'API key not found' })
  async findOne(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    return this.apiKeyService.findOne(user.id, id);
  }

  /**
   * Update an API key
   * PATCH /api/v1/console/api-keys/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiOkResponse({ description: 'API key updated successfully' })
  @ApiNotFoundResponse({ description: 'API key not found' })
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateApiKeySchema)) dto: UpdateApiKeyDto,
  ) {
    return this.apiKeyService.update(user.id, id, dto);
  }

  /**
   * Delete an API key
   * DELETE /api/v1/console/api-keys/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiNoContentResponse({ description: 'API key deleted successfully' })
  @ApiNotFoundResponse({ description: 'API key not found' })
  async delete(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.apiKeyService.delete(user.id, id);
  }
}
