/**
 * Admin Digest Service
 *
 * [INPUT]: Topic ID, featured 配置
 * [OUTPUT]: Topic 列表与更新结果
 * [POS]: Admin 精选话题管理服务
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  DigestTopicQuery,
  SetFeaturedDto,
  ReorderFeaturedDto,
} from './dto';

@Injectable()
export class AdminDigestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取话题列表（分页）
   */
  async getTopics(query: DigestTopicQuery) {
    const { page, limit, search, featured, visibility, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(featured !== undefined && { featured }),
      ...(visibility && { visibility }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [topics, total] = await Promise.all([
      this.prisma.digestTopic.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { featured: 'desc' },
          { featuredOrder: 'asc' },
          { subscriberCount: 'desc' },
        ],
        include: {
          createdBy: { select: { id: true, email: true, name: true } },
          featuredBy: { select: { id: true, email: true, name: true } },
          _count: { select: { editions: true, followers: true } },
        },
      }),
      this.prisma.digestTopic.count({ where }),
    ]);

    return {
      items: topics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取单个话题详情
   */
  async getTopic(id: string) {
    const topic = await this.prisma.digestTopic.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        featuredBy: { select: { id: true, email: true, name: true } },
        _count: { select: { editions: true, followers: true } },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    return topic;
  }

  /**
   * 设置/取消精选
   */
  async setFeatured(topicId: string, adminUserId: string, dto: SetFeaturedDto) {
    const topic = await this.prisma.digestTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    // 如果设置为精选，自动分配 order
    let featuredOrder = dto.featuredOrder;
    if (dto.featured && featuredOrder === undefined) {
      const maxOrder = await this.prisma.digestTopic.aggregate({
        where: { featured: true },
        _max: { featuredOrder: true },
      });
      featuredOrder = (maxOrder._max.featuredOrder ?? -1) + 1;
    }

    return this.prisma.digestTopic.update({
      where: { id: topicId },
      data: {
        featured: dto.featured,
        featuredOrder: dto.featured ? featuredOrder : null,
        featuredAt: dto.featured ? new Date() : null,
        featuredByUserId: dto.featured ? adminUserId : null,
      },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        featuredBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * 批量重排精选顺序
   */
  async reorderFeatured(dto: ReorderFeaturedDto) {
    const { topicIds } = dto;

    // 使用事务批量更新顺序
    await this.prisma.$transaction(
      topicIds.map((id, index) =>
        this.prisma.digestTopic.update({
          where: { id },
          data: { featuredOrder: index },
        }),
      ),
    );

    // 返回更新后的精选列表
    return this.prisma.digestTopic.findMany({
      where: { featured: true },
      orderBy: { featuredOrder: 'asc' },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        featuredBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * 获取精选话题列表（Admin 视角，不过滤 visibility/status）
   */
  async getFeaturedTopics() {
    return this.prisma.digestTopic.findMany({
      where: { featured: true },
      orderBy: { featuredOrder: 'asc' },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        featuredBy: { select: { id: true, email: true, name: true } },
        _count: { select: { editions: true, followers: true } },
      },
    });
  }
}
