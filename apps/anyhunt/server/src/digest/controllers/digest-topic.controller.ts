/**
 * Digest Topic Controller
 *
 * [INPUT]: 话题管理请求（创建、更新、删除）
 * [OUTPUT]: DigestTopic 响应
 * [POS]: Digest 话题管理 API（Session 认证）
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
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
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
  FollowTopicSchema,
  type CreateTopicInput,
  type UpdateTopicInput,
  type FollowTopicInput,
} from '../dto';

@ApiTags('Digest Topics')
@ApiSecurity('session')
@Controller({ path: 'app/digest/topics', version: '1' })
export class DigestTopicController {
  constructor(private readonly topicService: DigestTopicService) {}

  /**
   * 获取用户创建的话题
   * GET /api/v1/app/digest/topics
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
   * GET /api/v1/app/digest/topics/:id
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
   * POST /api/v1/app/digest/topics
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
   * PATCH /api/v1/app/digest/topics/:id
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
   * DELETE /api/v1/app/digest/topics/:id
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

  /**
   * 关注话题
   * POST /api/v1/app/digest/topics/:slug/follow
   */
  @Post(':slug/follow')
  @ApiOperation({ summary: 'Follow a topic' })
  @ApiParam({ name: 'slug', description: 'Topic slug' })
  @ApiCreatedResponse({ description: 'Subscription created' })
  async followTopic(
    @CurrentUser() user: CurrentUserDto,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(FollowTopicSchema)) input: FollowTopicInput,
  ) {
    const topic = await this.topicService.findBySlug(slug);

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    const subscription = await this.topicService.followTopic(
      user.id,
      topic.id,
      input,
    );

    return {
      subscriptionId: subscription.id,
      message: 'Successfully followed topic',
    };
  }

  /**
   * 取消关注话题
   * DELETE /api/v1/app/digest/topics/:slug/follow
   */
  @Delete(':slug/follow')
  @ApiOperation({ summary: 'Unfollow a topic' })
  @ApiParam({ name: 'slug', description: 'Topic slug' })
  @ApiNoContentResponse({ description: 'Unfollowed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollowTopic(
    @CurrentUser() user: CurrentUserDto,
    @Param('slug') slug: string,
  ): Promise<void> {
    const topic = await this.topicService.findBySlug(slug);

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    await this.topicService.unfollowTopic(user.id, topic.id);
  }
}
