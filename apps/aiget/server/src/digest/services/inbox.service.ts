/**
 * Digest Inbox Service
 *
 * [INPUT]: userId, 查询参数, 操作指令
 * [OUTPUT]: Inbox 条目列表、统计、操作结果
 * [POS]: 用户收件箱服务，管理已投递内容的阅读/收藏/不感兴趣状态
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DigestFeedbackService } from './feedback.service';
import type {
  InboxQuery,
  InboxStats,
  UpdateInboxItemInput,
  InboxItemResponse,
} from '../dto';
import type {
  DigestRunItem,
  UserContentState,
  Prisma,
} from '../../../generated/prisma-main/client';

export interface InboxItem extends DigestRunItem {
  run: {
    subscriptionId: string;
    subscription: { name: string };
  };
  content: {
    siteName: string | null;
    favicon: string | null;
  };
  userState?: UserContentState | null;
}

@Injectable()
export class DigestInboxService {
  private readonly logger = new Logger(DigestInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feedbackService: DigestFeedbackService,
  ) {}

  /**
   * 获取 Inbox 条目列表
   */
  async findMany(
    userId: string,
    query: InboxQuery,
  ): Promise<{
    items: InboxItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page,
      limit,
      subscriptionId,
      q,
      from,
      to,
      saved,
      unread,
      notInterested,
    } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.DigestRunItemWhereInput = {
      userId,
      ...(subscriptionId && { subscriptionId }),
      deliveredAt: {
        not: null,
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    };

    // 搜索条件
    if (q) {
      where.OR = [
        { titleSnapshot: { contains: q, mode: 'insensitive' } },
        { content: { siteName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // 用户状态过滤：必须放到 DB 层，避免内存过滤导致分页不正确
    const andFilters: Prisma.DigestRunItemWhereInput[] = [];

    if (saved !== undefined) {
      andFilters.push({
        content: {
          userContentStates: {
            [saved ? 'some' : 'none']: { userId, savedAt: { not: null } },
          },
        },
      });
    }

    if (unread !== undefined) {
      andFilters.push({
        content: {
          userContentStates: {
            [unread ? 'none' : 'some']: { userId, readAt: { not: null } },
          },
        },
      });
    }

    if (notInterested !== undefined) {
      andFilters.push({
        content: {
          userContentStates: {
            [notInterested ? 'some' : 'none']: {
              userId,
              notInterestedAt: { not: null },
            },
          },
        },
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const [items, total] = await Promise.all([
      this.prisma.digestRunItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deliveredAt: 'desc' },
        include: {
          run: {
            select: {
              subscriptionId: true,
              subscription: { select: { name: true } },
            },
          },
          content: {
            select: {
              siteName: true,
              favicon: true,
              userContentStates: {
                where: { userId },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.digestRunItem.count({ where }),
    ]);

    const normalizedItems = items.map((item) => ({
      ...item,
      userState: item.content.userContentStates?.[0] ?? null,
      content: {
        siteName: item.content.siteName,
        favicon: item.content.favicon,
      },
    }));

    return {
      items: normalizedItems as InboxItem[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取 Inbox 统计
   */
  async getStats(userId: string): Promise<InboxStats> {
    // 总数
    const totalCount = await this.prisma.digestRunItem.count({
      where: {
        userId,
        deliveredAt: { not: null },
      },
    });

    // 获取所有已投递的 URL hashes
    const deliveredUrlHashes = await this.prisma.digestRunItem.findMany({
      where: {
        userId,
        deliveredAt: { not: null },
      },
      select: { canonicalUrlHash: true },
      distinct: ['canonicalUrlHash'],
    });

    const urlHashes = deliveredUrlHashes.map((c) => c.canonicalUrlHash);

    // 已读状态
    const readStates = await this.prisma.userContentState.findMany({
      where: {
        userId,
        canonicalUrlHash: { in: urlHashes },
        readAt: { not: null },
      },
      select: { canonicalUrlHash: true },
    });

    const unreadCount = urlHashes.length - readStates.length;

    // 收藏数
    const savedCount = await this.prisma.userContentState.count({
      where: {
        userId,
        savedAt: { not: null },
      },
    });

    return {
      unreadCount: Math.max(0, unreadCount),
      savedCount,
      totalCount,
    };
  }

  /**
   * 更新条目状态
   */
  async updateItemState(
    userId: string,
    itemId: string,
    input: UpdateInboxItemInput,
  ): Promise<void> {
    // 获取条目（包含内容信息用于反馈学习）
    const item = await this.prisma.digestRunItem.findFirst({
      where: {
        id: itemId,
        userId,
        deliveredAt: { not: null },
      },
      include: {
        content: {
          select: {
            canonicalUrl: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Inbox item not found');
    }

    // 更新或创建用户状态
    const updateData: Partial<{
      readAt: Date | null;
      savedAt: Date | null;
      notInterestedAt: Date | null;
    }> = {};

    switch (input.action) {
      case 'markRead':
        updateData.readAt = new Date();
        break;
      case 'markUnread':
        updateData.readAt = null;
        break;
      case 'save':
        updateData.savedAt = new Date();
        break;
      case 'unsave':
        updateData.savedAt = null;
        break;
      case 'notInterested':
        updateData.notInterestedAt = new Date();
        break;
      case 'undoNotInterested':
        updateData.notInterestedAt = null;
        break;
    }

    await this.prisma.userContentState.upsert({
      where: {
        userId_canonicalUrlHash: {
          userId,
          canonicalUrlHash: item.canonicalUrlHash,
        },
      },
      create: {
        userId,
        canonicalUrlHash: item.canonicalUrlHash,
        ...updateData,
      },
      update: updateData,
    });

    // 记录反馈用于学习（save = 正向, notInterested = 负向）
    if (input.action === 'save' || input.action === 'notInterested') {
      try {
        await this.feedbackService.recordFeedback(
          item.subscriptionId,
          {
            title: item.titleSnapshot,
            url: item.content.canonicalUrl,
            aiSummary: item.aiSummarySnapshot ?? undefined,
          },
          input.action === 'save' ? 'positive' : 'negative',
        );
        this.logger.debug(
          `Recorded ${input.action === 'save' ? 'positive' : 'negative'} feedback for item ${itemId}`,
        );
      } catch (error) {
        // 反馈记录失败不影响主流程
        this.logger.warn(
          `Failed to record feedback for item ${itemId}:`,
          error,
        );
      }
    }

    this.logger.debug(`Updated inbox item ${itemId} state: ${input.action}`);
  }

  /**
   * 批量标记已读
   */
  async markAllRead(userId: string, subscriptionId?: string): Promise<number> {
    // 获取所有未读的条目
    const items = await this.prisma.digestRunItem.findMany({
      where: {
        userId,
        ...(subscriptionId && { subscriptionId }),
        deliveredAt: { not: null },
      },
      select: { canonicalUrlHash: true },
      distinct: ['canonicalUrlHash'],
    });

    if (items.length === 0) {
      return 0;
    }

    const urlHashes = items.map((item) => item.canonicalUrlHash);

    // 批量 upsert
    const now = new Date();
    let count = 0;

    for (const canonicalUrlHash of urlHashes) {
      await this.prisma.userContentState.upsert({
        where: {
          userId_canonicalUrlHash: { userId, canonicalUrlHash },
        },
        create: {
          userId,
          canonicalUrlHash,
          readAt: now,
        },
        update: {
          readAt: now,
        },
      });
      count++;
    }

    this.logger.log(`Marked ${count} items as read for user ${userId}`);

    return count;
  }

  /**
   * 格式化为 API 响应
   */
  toResponse(item: InboxItem): InboxItemResponse {
    return {
      id: item.id,
      runId: item.runId,
      subscriptionId: item.subscriptionId,
      subscriptionName: item.run.subscription.name,
      contentId: item.contentId,
      canonicalUrlHash: item.canonicalUrlHash,
      scoreRelevance: item.scoreRelevance,
      scoreOverall: item.scoreOverall,
      scoringReason: item.scoringReason,
      rank: item.rank,
      titleSnapshot: item.titleSnapshot,
      urlSnapshot: item.urlSnapshot,
      aiSummarySnapshot: item.aiSummarySnapshot,
      siteName: item.content.siteName,
      favicon: item.content.favicon,
      deliveredAt: item.deliveredAt,
      readAt: item.userState?.readAt ?? null,
      savedAt: item.userState?.savedAt ?? null,
      notInterestedAt: item.userState?.notInterestedAt ?? null,
    };
  }
}
