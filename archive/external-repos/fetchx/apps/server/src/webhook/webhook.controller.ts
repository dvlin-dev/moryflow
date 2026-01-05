/**
 * [INPUT]: CreateWebhookDto, UpdateWebhookDto - Webhook creation and update requests
 * [OUTPUT]: WebhookEntity - Webhook data or void for deletion
 * [POS]: Webhook CRUD API, called by Console frontend
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and the directory CLAUDE.md
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
import type { CurrentUserDto } from '../types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { WebhookService } from './webhook.service';
import {
  createWebhookSchema,
  updateWebhookSchema,
  type CreateWebhookDto,
  type UpdateWebhookDto,
} from './dto';

@ApiTags('Webhook')
@ApiSecurity('session')
@Controller({ path: 'console/webhooks', version: '1' })
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * 创建 Webhook
   * POST /api/console/webhooks
   */
  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiCreatedResponse({ description: 'Webhook created successfully' })
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(createWebhookSchema)) dto: CreateWebhookDto,
  ) {
    const result = await this.webhookService.create(user.id, dto);
    return result;
  }

  /**
   * 获取所有 Webhooks
   * GET /api/console/webhooks
   */
  @Get()
  @ApiOperation({ summary: 'List all webhooks for current user' })
  @ApiOkResponse({ description: 'Successfully returned webhooks list' })
  async findAll(@CurrentUser() user: CurrentUserDto) {
    const webhooks = await this.webhookService.findAllByUser(user.id);
    return webhooks;
  }

  /**
   * 获取单个 Webhook
   * GET /api/console/webhooks/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiOkResponse({ description: 'Successfully returned webhook' })
  @ApiNotFoundResponse({ description: 'Webhook not found' })
  async findOne(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    const webhook = await this.webhookService.findOne(id, user.id);
    return webhook;
  }

  /**
   * 更新 Webhook
   * PATCH /api/console/webhooks/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiOkResponse({ description: 'Webhook updated successfully' })
  @ApiNotFoundResponse({ description: 'Webhook not found' })
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWebhookSchema)) dto: UpdateWebhookDto,
  ) {
    const updated = await this.webhookService.update(id, user.id, dto);
    return updated;
  }

  /**
   * 删除 Webhook
   * DELETE /api/console/webhooks/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiNoContentResponse({ description: 'Webhook deleted successfully' })
  @ApiNotFoundResponse({ description: 'Webhook not found' })
  async remove(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.webhookService.remove(id, user.id);
  }

  /**
   * 重新生成 Secret
   * POST /api/console/webhooks/:id/regenerate-secret
   */
  @Post(':id/regenerate-secret')
  @ApiOperation({ summary: 'Regenerate webhook secret' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiOkResponse({ description: 'Webhook secret regenerated successfully' })
  @ApiNotFoundResponse({ description: 'Webhook not found' })
  async regenerateSecret(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    const webhook = await this.webhookService.regenerateSecret(id, user.id);
    return webhook;
  }
}
