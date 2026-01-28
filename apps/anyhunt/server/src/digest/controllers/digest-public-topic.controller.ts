/**
 * Digest Public Topic Controller
 *
 * [INPUT]: 公开话题浏览/举报请求
 * [OUTPUT]: DigestTopic, Edition 列表
 * [POS]: Public 话题 API（公开浏览 + 举报）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { OptionalAuthGuard, Public } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DigestTopicService } from '../services/topic.service';
import { DigestReportService } from '../services/report.service';
import {
  PublicTopicsQuerySchema,
  EditionsQuerySchema,
  CreateReportSchema,
  type PublicTopicsQuery,
  type EditionsQuery,
  type CreateReportInput,
} from '../dto';

@ApiTags('Public - Digest Topics')
@Controller({ path: 'public/digest/topics', version: '1' })
export class DigestPublicTopicController {
  constructor(
    private readonly topicService: DigestTopicService,
    private readonly reportService: DigestReportService,
  ) {}

  /**
   * 获取公开话题列表
   * GET /api/v1/public/digest/topics
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'List public topics' })
  @ApiOkResponse({ description: 'Public topic list with pagination' })
  async findPublicTopics(
    @Query(new ZodValidationPipe(PublicTopicsQuerySchema))
    query: PublicTopicsQuery,
  ) {
    const { items, total, page, limit, totalPages } =
      await this.topicService.findPublicTopics(query);

    return {
      items: items.map((t) => this.topicService.toResponse(t)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 获取话题详情（通过 Slug）
   * GET /api/v1/public/digest/topics/:slug
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
   * GET /api/v1/public/digest/topics/:slug/editions
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

    const { items, total, page, limit, totalPages } =
      await this.topicService.findEditions(topic.id, query);

    return {
      items: items.map((e) => this.topicService.toEditionResponse(e)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 获取 Edition 详情
   * GET /api/v1/public/digest/topics/:slug/editions/:editionId
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
   * 举报话题
   * POST /api/v1/public/digest/topics/:slug/report
   * 支持匿名或登录用户举报（若带 access token 会记录 userId）
   */
  @Post(':slug/report')
  @Public()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Report a topic for spam/copyright/etc' })
  @ApiParam({ name: 'slug', description: 'Topic slug' })
  @ApiCreatedResponse({ description: 'Report created' })
  async reportTopic(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(CreateReportSchema)) input: CreateReportInput,
    @Req() req: Request,
  ) {
    const topic = await this.topicService.findBySlug(slug);

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    // 获取真实 IP（支持反向代理）
    const reporterIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      undefined;

    // 尝试获取用户（如果已登录）
    const user = req.user;

    const report = await this.reportService.create(
      { ...input, topicId: topic.id },
      user?.id,
      reporterIp,
    );

    return {
      reportId: report.id,
      message: 'Report submitted successfully. We will review it shortly.',
    };
  }
}
