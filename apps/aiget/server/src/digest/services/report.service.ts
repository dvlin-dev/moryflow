/**
 * Digest Report Service
 *
 * [INPUT]: 举报创建/查询/处理参数
 * [OUTPUT]: DigestTopicReport
 * [POS]: 话题举报管理服务
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateReportInput,
  ResolveReportInput,
  ListReportsQuery,
  ReportResponse,
} from '../dto';
import type {
  DigestTopicReport,
  DigestTopicReportStatus,
  Prisma,
} from '../../../generated/prisma-main/client';

@Injectable()
export class DigestReportService {
  private readonly logger = new Logger(DigestReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建举报
   */
  async create(
    input: CreateReportInput,
    reporterUserId?: string,
    reporterIp?: string,
  ): Promise<DigestTopicReport> {
    // 1. 验证话题存在且为公开
    const topic = await this.prisma.digestTopic.findFirst({
      where: {
        id: input.topicId,
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found or not public');
    }

    // 2. 检查是否重复举报（同一用户/IP 对同一话题只能举报一次待处理）
    const existingReport = await this.prisma.digestTopicReport.findFirst({
      where: {
        topicId: input.topicId,
        status: 'PENDING',
        OR: [
          ...(reporterUserId ? [{ reporterUserId }] : []),
          ...(reporterIp ? [{ reporterIp }] : []),
        ],
      },
    });

    if (existingReport) {
      throw new ConflictException('You have already reported this topic');
    }

    // 3. 创建举报
    const report = await this.prisma.digestTopicReport.create({
      data: {
        topicId: input.topicId,
        reporterUserId,
        reporterIp,
        reason: input.reason,
        description: input.description,
      },
    });

    this.logger.log(
      `Created report ${report.id} for topic ${input.topicId} (reason: ${input.reason})`,
    );

    return report;
  }

  /**
   * 处理举报（管理员）
   */
  async resolve(
    reportId: string,
    adminUserId: string,
    input: ResolveReportInput,
  ): Promise<DigestTopicReport> {
    const report = await this.prisma.digestTopicReport.findUnique({
      where: { id: reportId },
      include: { topic: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'PENDING') {
      throw new ConflictException('Report has already been resolved');
    }

    // 使用事务处理
    const [updatedReport] = await this.prisma.$transaction(async (tx) => {
      // 1. 更新举报状态
      const updated = await tx.digestTopicReport.update({
        where: { id: reportId },
        data: {
          status: input.status,
          resolvedAt: new Date(),
          resolvedById: adminUserId,
          resolveNote: input.resolveNote,
        },
      });

      // 2. 如果举报有效且需要暂停话题
      if (input.status === 'RESOLVED_VALID' && input.pauseTopic) {
        await tx.digestTopic.update({
          where: { id: report.topicId },
          data: {
            status: 'PAUSED_BY_ADMIN',
            pausedAt: new Date(),
            pauseReason: `Report #${reportId}: ${report.reason}`,
          },
        });

        this.logger.warn(
          `Topic ${report.topicId} paused due to valid report ${reportId}`,
        );
      }

      return [updated];
    });

    this.logger.log(
      `Report ${reportId} resolved by admin ${adminUserId}: ${input.status}`,
    );

    return updatedReport;
  }

  /**
   * 获取举报列表（管理员）
   */
  async findMany(query: ListReportsQuery): Promise<{
    items: (DigestTopicReport & {
      topic: { id: string; slug: string; title: string };
    })[];
    nextCursor: string | null;
  }> {
    const { cursor, limit, status, topicId } = query;

    const where: Prisma.DigestTopicReportWhereInput = {
      ...(status && { status }),
      ...(topicId && { topicId }),
    };

    const items = await this.prisma.digestTopicReport.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        topic: { select: { id: true, slug: true, title: true } },
      },
    });

    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * 获取单个举报详情
   */
  async findById(reportId: string): Promise<
    | (DigestTopicReport & {
        topic: { id: string; slug: string; title: string };
      })
    | null
  > {
    return this.prisma.digestTopicReport.findUnique({
      where: { id: reportId },
      include: {
        topic: { select: { id: true, slug: true, title: true } },
      },
    });
  }

  /**
   * 获取待处理举报数量
   */
  async getPendingCount(): Promise<number> {
    return this.prisma.digestTopicReport.count({
      where: { status: 'PENDING' },
    });
  }

  /**
   * 格式化举报为 API 响应
   */
  toResponse(
    report: DigestTopicReport & {
      topic?: { id: string; slug: string; title: string };
    },
  ): ReportResponse {
    return {
      id: report.id,
      topicId: report.topicId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
      resolveNote: report.resolveNote,
      topic: report.topic,
    };
  }
}
