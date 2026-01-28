/**
 * API Key Controller
 *
 * [INPUT]: API Key CRUD 请求
 * [OUTPUT]: API Key 数据
 * [POS]: App API Key 管理接口（Session 认证）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Header,
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
@Controller({ path: 'app/api-keys', version: '1' })
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Create a new API key
   * POST /api/v1/app/api-keys
   */
  @Post()
  @Header('Cache-Control', 'no-store')
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
   * GET /api/v1/app/api-keys
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'List all API keys for current user' })
  @ApiOkResponse({ description: 'Successfully returned API keys list' })
  async findAll(@CurrentUser() user: CurrentUserDto) {
    return this.apiKeyService.findAllByUser(user.id);
  }

  /**
   * Update an API key
   * PATCH /api/v1/app/api-keys/:id
   */
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
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
   * DELETE /api/v1/app/api-keys/:id
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
