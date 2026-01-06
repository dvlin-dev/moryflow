import { Injectable, Inject } from '@nestjs/common';
import type { PrismaClient } from '@aiget/identity-db';
import { IDENTITY_PRISMA } from '../prisma/prisma.module';
import type { ListCreditsQuery } from './dto';

@Injectable()
export class CreditsService {
  constructor(@Inject(IDENTITY_PRISMA) private readonly prisma: PrismaClient) {}

  async listCredits(query: ListCreditsQuery) {
    const { page, limit, type, userId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const [credits, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.creditTransaction.count({ where }),
    ]);

    return {
      items: credits.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
