/**
 * Digest Console Topic Controller
 *
 * [INPUT]: 话题管理请求（创建、更新、删除）
 * [OUTPUT]: DigestTopic 响应
 * [POS]: Console 话题管理 API（Session 认证）
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
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { CurrentUserDto } from '../../types';
import { DigestTopicService } from '../services/topic.service';
import {
  CreateTopicSchema,
  UpdateTopicSchema,
  type CreateTopicInput,
  type UpdateTopicInput,
} from '../dto';

@ApiTags('Console - Digest Topics')
@ApiCookieAuth()
@Controller({ path: 'console/digest/topics', version: VERSION_NEUTRAL })
export class DigestConsoleTopicController {
  constructor(private readonly topicService: DigestTopicService) {}

  /**
   * 获取用户创建的话题
   * GET /api/console/digest/topics
   */
  @Get()
  @ApiOperation({ summary: 'List user created topics' })
  @ApiOkResponse({ description: 'Topic list' })
  async findUserTopics(@CurrentUser() user: CurrentUserDto) {
    const topics = await this.topicService.findUserTopics(user.id);
    return {
      items: topics.map((t) => this.topicService.toResponse(t)),
    };
  }

  /**
   * 获取单个话题详情
   * GET /api/console/digest/topics/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get topic by ID' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiOkResponse({ description: 'Topic details' })
  async findOne(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    const topic = await this.topicService.findById(id);

    if (!topic || topic.createdByUserId !== user.id) {
      throw new NotFoundException('Topic not found');
    }

    return this.topicService.toResponse(topic);
  }

  /**
   * 创建公开话题（从订阅发布）
   * POST /api/console/digest/topics
   */
  @Post()
  @ApiOperation({ summary: 'Create a public topic from subscription' })
  @ApiCreatedResponse({ description: 'Topic created' })
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(CreateTopicSchema)) input: CreateTopicInput,
  ) {
    const topic = await this.topicService.create(user.id, input);
    return this.topicService.toResponse(topic);
  }

  /**
   * 更新话题
   * PATCH /api/console/digest/topics/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update topic' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiOkResponse({ description: 'Topic updated' })
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTopicSchema)) input: UpdateTopicInput,
  ) {
    const topic = await this.topicService.update(user.id, id, input);
    return this.topicService.toResponse(topic);
  }

  /**
   * 删除话题
   * DELETE /api/console/digest/topics/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete topic' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiNoContentResponse({ description: 'Topic deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.topicService.delete(user.id, id);
  }
}
