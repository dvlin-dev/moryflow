/**
 * Digest Public Topic Controller
 *
 * [INPUT]: 公开话题浏览/关注请求
 * [OUTPUT]: DigestTopic, Edition 列表
 * [POS]: Public 话题 API（部分需要认证）
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CurrentUser, Public } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { CurrentUserDto } from '../../types';
import { DigestTopicService } from '../services/topic.service';
import {
  PublicTopicsQuerySchema,
  EditionsQuerySchema,
  FollowTopicSchema,
  type PublicTopicsQuery,
  type EditionsQuery,
  type FollowTopicInput,
} from '../dto';

@ApiTags('Public - Digest Topics')
@Controller({ path: 'digest/topics', version: '1' })
export class DigestPublicTopicController {
  constructor(private readonly topicService: DigestTopicService) {}

  /**
   * 获取公开话题列表
   * GET /api/v1/digest/topics
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'List public topics' })
  @ApiOkResponse({ description: 'Public topic list with pagination' })
  async findPublicTopics(
    @Query(new ZodValidationPipe(PublicTopicsQuerySchema))
    query: PublicTopicsQuery,
  ) {
    const { items, nextCursor } =
      await this.topicService.findPublicTopics(query);

    return {
      items: items.map((t) => this.topicService.toResponse(t)),
      nextCursor,
    };
  }

  /**
   * 获取话题详情（通过 Slug）
   * GET /api/v1/digest/topics/:slug
   */
  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get topic by slug' })
  @ApiParam({ name: 'slug', description: 'Topic slug' })
  @ApiOkResponse({ description: 'Topic details' })
  async findBySlug(@Param('slug') slug: string) {
    const topic = await this.topicService.findBySlug(slug);

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    return this.topicService.toResponse(topic);
  }

  /**
   * 获取话题的 Edition 列表
   * GET /api/v1/digest/topics/:slug/editions
   */
  @Get(':slug/editions')
  @Public()
  @ApiOperation({ summary: 'List topic editions' })
  @ApiParam({ name: 'slug', description: 'Topic slug' })
  @ApiOkResponse({ description: 'Edition list with pagination' })
  async findEditions(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(EditionsQuerySchema)) query: EditionsQuery,
  ) {
    const topic = await this.topicService.findBySlug(slug);

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    const { items, nextCursor } = await this.topicService.findEditions(
      topic.id,
      query,
    );

    return {
      items: items.map((e) => this.topicService.toEditionResponse(e)),
      nextCursor,
    };
  }

  /**
   * 获取 Edition 详情
   * GET /api/v1/digest/topics/:slug/editions/:editionId
   */
  @Get(':slug/editions/:editionId')
  @Public()
  @ApiOperation({ summary: 'Get edition details' })
  @ApiParam({ name: 'slug', description: 'Topic slug' })
  @ApiParam({ name: 'editionId', description: 'Edition ID' })
  @ApiOkResponse({ description: 'Edition with items' })
  async findEditionDetails(
    @Param('slug') slug: string,
    @Param('editionId') editionId: string,
  ) {
    const topic = await this.topicService.findBySlug(slug);

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    const edition = await this.topicService.findEditionById(editionId);

    if (!edition || edition.topicId !== topic.id) {
      throw new NotFoundException('Edition not found');
    }

    const items = await this.topicService.findEditionItems(editionId);

    return {
      edition: this.topicService.toEditionResponse(edition),
      items: items.map((item) => this.topicService.toEditionItemResponse(item)),
    };
  }

  /**
   * 关注话题
   * POST /api/v1/digest/topics/:slug/follow
   */
  @Post(':slug/follow')
  @ApiCookieAuth()
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
   * DELETE /api/v1/digest/topics/:slug/follow
   */
  @Delete(':slug/follow')
  @ApiCookieAuth()
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
