import { Injectable, Inject } from '@nestjs/common';
import type { PrismaClient } from '@aiget/identity-db';
import { IDENTITY_PRISMA } from '../prisma/prisma.module';
import type { ListLogsQuery } from './dto';

@Injectable()
export class LogsService {
  constructor(@Inject(IDENTITY_PRISMA) private readonly prisma: PrismaClient) {}

  async listLogs(query: ListLogsQuery) {
    const { page, limit, level, action, adminId, targetUserId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (level) where.level = level;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (adminId) where.adminId = adminId;
    if (targetUserId) where.targetUserId = targetUserId;

    const [logs, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return {
      items: logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
