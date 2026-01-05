/**
 * API Key Controller
 *
 * [INPUT]: CreateApiKeyDto, UpdateApiKeyDto
 * [OUTPUT]: ApiKey responses
 * [POS]: Console API for API Key management (Session auth)
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
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCookieAuth,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto';

@ApiTags('ApiKey')
@ApiCookieAuth()
@Controller({ path: 'console/api-keys', version: VERSION_NEUTRAL })
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Create a new API key
   */
  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiOkResponse({ description: 'API key created' })
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.create(user.id, dto);
  }

  /**
   * List all API keys for current user
   */
  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  @ApiOkResponse({ description: 'List of API keys' })
  async findAll(@CurrentUser() user: CurrentUserDto) {
    return this.apiKeyService.findAllByUser(user.id);
  }

  /**
   * Get a single API key
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get an API key by ID' })
  @ApiOkResponse({ description: 'API key details' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  async findOne(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.findOne(user.id, id);
  }

  /**
   * Update an API key
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update an API key' })
  @ApiOkResponse({ description: 'API key updated' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    return this.apiKeyService.update(user.id, id, dto);
  }

  /**
   * Delete an API key
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiNoContentResponse({ description: 'API key deleted' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  async delete(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.apiKeyService.delete(user.id, id);
  }
}
