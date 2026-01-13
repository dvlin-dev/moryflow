/**
 * Digest Inbox Service
 *
 * [INPUT]: userId, 查询参数, 操作指令
 * [OUTPUT]: Inbox 条目列表、统计、操作结果
 * [POS]: 用户收件箱服务，管理已投递内容的阅读/收藏/不感兴趣状态
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取 Inbox 条目列表
   */
  async findMany(
    userId: string,
    query: InboxQuery,
  ): Promise<{ items: InboxItem[]; nextCursor: string | null }> {
    const {
      cursor,
      limit,
      subscriptionId,
      q,
      from,
      to,
      saved,
      unread,
      notInterested,
    } = query;

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

    // 获取基础条目
    const items = await this.prisma.digestRunItem.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { deliveredAt: 'desc' },
      include: {
        run: {
          select: {
            subscriptionId: true,
            subscription: { select: { name: true } },
          },
        },
        content: {
          select: { siteName: true, favicon: true },
        },
      },
    });

    // 获取用户状态
    const urlHashes = items.map((item) => item.canonicalUrlHash);
    const userStates = await this.prisma.userContentState.findMany({
      where: {
        userId,
        canonicalUrlHash: { in: urlHashes },
      },
    });

    const stateMap = new Map(userStates.map((s) => [s.canonicalUrlHash, s]));

    // 合并用户状态并过滤
    let filteredItems = items.map((item) => ({
      ...item,
      userState: stateMap.get(item.canonicalUrlHash) || null,
    }));

    // 应用用户状态过滤
    if (saved !== undefined) {
      filteredItems = filteredItems.filter((item) =>
        saved ? item.userState?.savedAt !== null : !item.userState?.savedAt,
      );
    }

    if (unread !== undefined) {
      filteredItems = filteredItems.filter((item) =>
        unread ? !item.userState?.readAt : item.userState?.readAt !== null,
      );
    }

    if (notInterested !== undefined) {
      filteredItems = filteredItems.filter((item) =>
        notInterested
          ? item.userState?.notInterestedAt !== null
          : !item.userState?.notInterestedAt,
      );
    }

    const hasMore = filteredItems.length > limit;
    if (hasMore) {
      filteredItems.pop();
    }

    return {
      items: filteredItems as InboxItem[],
      nextCursor: hasMore
        ? (filteredItems[filteredItems.length - 1]?.id ?? null)
        : null,
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
    // 获取条目
    const item = await this.prisma.digestRunItem.findFirst({
      where: {
        id: itemId,
        userId,
        deliveredAt: { not: null },
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
