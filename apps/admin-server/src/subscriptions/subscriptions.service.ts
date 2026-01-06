/**
 * [INPUT]: 订阅管理请求
 * [OUTPUT]: 订阅数据
 * [POS]: 订阅管理服务
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@aiget/identity-db';
import { IDENTITY_PRISMA } from '../prisma/prisma.module';
import type { ListSubscriptionsQuery } from './dto';

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(IDENTITY_PRISMA) private readonly prisma: PrismaClient) {}

  async listSubscriptions(query: ListSubscriptionsQuery) {
    const { page, limit, status, userId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items: subscriptions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        currentPeriodStart: s.currentPeriodStart.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        canceledAt: s.canceledAt?.toISOString() ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSubscriptionById(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        orders: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }
}
