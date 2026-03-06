/**
 * [INPUT]: 请求日志写入数据与 Admin 查询参数
 * [OUTPUT]: RequestLog 持久化结果、聚合统计结果
 * [POS]: RequestLog 模块核心服务（写入 + 查询 + 聚合）
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-main/client';
import { PrismaService } from '../prisma';
import {
  REQUEST_LOG_DEFAULT_RANGE_DAYS,
  REQUEST_LOG_MAX_ERROR_MESSAGE_LENGTH,
  REQUEST_LOG_MAX_PATH_LENGTH,
  REQUEST_LOG_MAX_ROUTE_GROUP_LENGTH,
  REQUEST_LOG_MAX_USER_AGENT_LENGTH,
} from './request-log.constants';
import type {
  RequestLogIpQuery,
  RequestLogListQuery,
  RequestLogOverviewQuery,
  RequestLogUsersQuery,
} from './dto';

export type RequestLogWriteInput = {
  requestId?: string;
  method: string;
  path: string;
  routeGroup?: string;
  statusCode: number;
  durationMs: number;
  authType?: string;
  userId?: string;
  apiKeyId?: string;
  clientIp: string;
  forwardedFor?: string;
  origin?: string;
  referer?: string;
  userAgent?: string;
  errorCode?: string;
  errorMessage?: string;
  retryAfter?: string;
  rateLimitLimit?: string;
  rateLimitRemaining?: string;
  rateLimitReset?: string;
  requestBytes?: number;
  responseBytes?: number;
};

type TimeRange = {
  from: Date;
  to: Date;
};

const ISO_DATETIME_WITH_OFFSET_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

@Injectable()
export class RequestLogService {
  private readonly logger = new Logger(RequestLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  writeAsync(input: RequestLogWriteInput): void {
    const data = this.normalizeWriteInput(input);

    this.logger.log(
      JSON.stringify({
        event: 'request_log',
        requestId: data.requestId ?? null,
        method: data.method,
        path: data.path,
        statusCode: data.statusCode,
        durationMs: data.durationMs,
        authType: data.authType ?? 'anonymous',
        userId: data.userId ?? null,
        apiKeyId: data.apiKeyId ?? null,
        clientIp: data.clientIp,
        errorCode: data.errorCode ?? null,
      }),
    );

    void this.prisma.requestLog.create({ data }).catch((error: unknown) => {
      this.logger.error(
        `Failed to persist request log: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  async getRequests(query: RequestLogListQuery) {
    const range = this.resolveTimeRange(query.from, query.to);
    const where = this.buildListWhere(query, range);
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.requestLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.requestLog.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      window: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
    };
  }

  async getOverview(query: RequestLogOverviewQuery) {
    const range = this.resolveTimeRange(query.from, query.to);

    const [totalRequests, errorRequests, p95Rows, topRoutes, topErrorCodes] =
      await Promise.all([
        this.prisma.requestLog.count({
          where: {
            createdAt: { gte: range.from, lt: range.to },
          },
        }),
        this.prisma.requestLog.count({
          where: {
            createdAt: { gte: range.from, lt: range.to },
            OR: [{ statusCode: { gte: 400 } }, { errorCode: { not: null } }],
          },
        }),
        this.prisma.$queryRaw<Array<{ p95DurationMs: number | null }>>(
          Prisma.sql`
            SELECT
              CAST(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs") AS DOUBLE PRECISION) AS "p95DurationMs"
            FROM "RequestLog"
            WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to}
          `,
        ),
        this.prisma.$queryRaw<
          Array<{
            routeGroup: string;
            requestCount: number;
            errorCount: number;
            avgDurationMs: number | null;
          }>
        >(
          Prisma.sql`
            SELECT
              COALESCE("routeGroup", 'unknown') AS "routeGroup",
              COUNT(*)::int AS "requestCount",
              COUNT(*) FILTER (WHERE "statusCode" >= 400 OR "errorCode" IS NOT NULL)::int AS "errorCount",
              ROUND(AVG("durationMs")::numeric, 2)::double precision AS "avgDurationMs"
            FROM "RequestLog"
            WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to}
            GROUP BY COALESCE("routeGroup", 'unknown')
            ORDER BY "requestCount" DESC
            LIMIT 10
          `,
        ),
        this.prisma.$queryRaw<Array<{ errorCode: string; count: number }>>(
          Prisma.sql`
            SELECT
              COALESCE(NULLIF("errorCode", ''), CONCAT('HTTP_', "statusCode"::text)) AS "errorCode",
              COUNT(*)::int AS "count"
            FROM "RequestLog"
            WHERE "createdAt" >= ${range.from}
              AND "createdAt" < ${range.to}
              AND ("statusCode" >= 400 OR "errorCode" IS NOT NULL)
            GROUP BY COALESCE(NULLIF("errorCode", ''), CONCAT('HTTP_', "statusCode"::text))
            ORDER BY "count" DESC
            LIMIT 10
          `,
        ),
      ]);

    const p95DurationMs = this.toInt(p95Rows[0]?.p95DurationMs);
    const errorRate = this.toRate(errorRequests, totalRequests);

    return {
      window: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      totalRequests,
      errorRequests,
      errorRate,
      p95DurationMs,
      topRoutes: topRoutes.map((row) => ({
        routeGroup: row.routeGroup,
        requestCount: this.toInt(row.requestCount),
        errorCount: this.toInt(row.errorCount),
        errorRate: this.toRate(row.errorCount, row.requestCount),
        avgDurationMs: this.toInt(row.avgDurationMs),
      })),
      topErrorCodes: topErrorCodes.map((row) => ({
        errorCode: row.errorCode,
        count: this.toInt(row.count),
      })),
    };
  }

  async getUsers(query: RequestLogUsersQuery) {
    const range = this.resolveTimeRange(query.from, query.to);

    const [topUsers, activeUsersDaily] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          userId: string;
          requestCount: number;
          errorCount: number;
          avgDurationMs: number | null;
        }>
      >(
        Prisma.sql`
          SELECT
            "userId",
            COUNT(*)::int AS "requestCount",
            COUNT(*) FILTER (WHERE "statusCode" >= 400 OR "errorCode" IS NOT NULL)::int AS "errorCount",
            ROUND(AVG("durationMs")::numeric, 2)::double precision AS "avgDurationMs"
          FROM "RequestLog"
          WHERE "createdAt" >= ${range.from}
            AND "createdAt" < ${range.to}
            AND "userId" IS NOT NULL
          GROUP BY "userId"
          ORDER BY "requestCount" DESC
          LIMIT ${query.limit}
        `,
      ),
      this.prisma.$queryRaw<
        Array<{
          date: string;
          activeUsers: number;
        }>
      >(
        Prisma.sql`
          SELECT
            to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS "date",
            COUNT(DISTINCT "userId")::int AS "activeUsers"
          FROM "RequestLog"
          WHERE "createdAt" >= ${range.from}
            AND "createdAt" < ${range.to}
            AND "userId" IS NOT NULL
          GROUP BY 1
          ORDER BY 1 ASC
        `,
      ),
    ]);

    return {
      window: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      topUsers: topUsers.map((row) => ({
        userId: row.userId,
        requestCount: this.toInt(row.requestCount),
        errorCount: this.toInt(row.errorCount),
        errorRate: this.toRate(row.errorCount, row.requestCount),
        avgDurationMs: this.toInt(row.avgDurationMs),
      })),
      activeUsersDaily: activeUsersDaily.map((row) => ({
        date: row.date,
        activeUsers: this.toInt(row.activeUsers),
      })),
    };
  }

  async getIpStats(query: RequestLogIpQuery) {
    const range = this.resolveTimeRange(query.from, query.to);

    const [topIpByRequests, topIpByErrorRate, ipTrend] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          clientIp: string;
          requestCount: number;
          errorCount: number;
        }>
      >(
        Prisma.sql`
          SELECT
            "clientIp",
            COUNT(*)::int AS "requestCount",
            COUNT(*) FILTER (WHERE "statusCode" >= 400 OR "errorCode" IS NOT NULL)::int AS "errorCount"
          FROM "RequestLog"
          WHERE "createdAt" >= ${range.from}
            AND "createdAt" < ${range.to}
          GROUP BY "clientIp"
          ORDER BY "requestCount" DESC
          LIMIT ${query.limit}
        `,
      ),
      this.prisma.$queryRaw<
        Array<{
          clientIp: string;
          requestCount: number;
          errorCount: number;
        }>
      >(
        Prisma.sql`
          SELECT
            "clientIp",
            COUNT(*)::int AS "requestCount",
            COUNT(*) FILTER (WHERE "statusCode" >= 400 OR "errorCode" IS NOT NULL)::int AS "errorCount"
          FROM "RequestLog"
          WHERE "createdAt" >= ${range.from}
            AND "createdAt" < ${range.to}
          GROUP BY "clientIp"
          HAVING COUNT(*) >= 20
          ORDER BY (COUNT(*) FILTER (WHERE "statusCode" >= 400 OR "errorCode" IS NOT NULL))::float / NULLIF(COUNT(*), 0) DESC,
                   COUNT(*) DESC
          LIMIT ${query.limit}
        `,
      ),
      query.clientIp
        ? this.prisma.$queryRaw<
            Array<{
              date: string;
              requestCount: number;
              errorCount: number;
            }>
          >(
            Prisma.sql`
              SELECT
                to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS "date",
                COUNT(*)::int AS "requestCount",
                COUNT(*) FILTER (WHERE "statusCode" >= 400 OR "errorCode" IS NOT NULL)::int AS "errorCount"
              FROM "RequestLog"
              WHERE "createdAt" >= ${range.from}
                AND "createdAt" < ${range.to}
                AND "clientIp" = ${query.clientIp}
              GROUP BY 1
              ORDER BY 1 ASC
            `,
          )
        : Promise.resolve([]),
    ]);

    return {
      window: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      topIpByRequests: topIpByRequests.map((row) => ({
        clientIp: row.clientIp,
        requestCount: this.toInt(row.requestCount),
        errorCount: this.toInt(row.errorCount),
        errorRate: this.toRate(row.errorCount, row.requestCount),
      })),
      topIpByErrorRate: topIpByErrorRate.map((row) => ({
        clientIp: row.clientIp,
        requestCount: this.toInt(row.requestCount),
        errorCount: this.toInt(row.errorCount),
        errorRate: this.toRate(row.errorCount, row.requestCount),
      })),
      ipTrend: ipTrend.map((row) => ({
        date: row.date,
        requestCount: this.toInt(row.requestCount),
        errorCount: this.toInt(row.errorCount),
      })),
    };
  }

  async deleteExpiredBatch(cutoff: Date, batchSize: number): Promise<number> {
    const expired = await this.prisma.requestLog.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    if (expired.length === 0) {
      return 0;
    }

    const result = await this.prisma.requestLog.deleteMany({
      where: {
        id: { in: expired.map((item) => item.id) },
      },
    });

    return result.count;
  }

  private buildListWhere(
    query: RequestLogListQuery,
    range: TimeRange,
  ): Prisma.RequestLogWhereInput {
    const where: Prisma.RequestLogWhereInput = {
      createdAt: { gte: range.from, lt: range.to },
      ...(query.statusCode !== undefined
        ? { statusCode: query.statusCode }
        : {}),
      ...(query.routeGroup ? { routeGroup: query.routeGroup } : {}),
      ...(query.pathLike
        ? { path: { contains: query.pathLike, mode: 'insensitive' as const } }
        : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.apiKeyId ? { apiKeyId: query.apiKeyId } : {}),
      ...(query.clientIp ? { clientIp: query.clientIp } : {}),
    };

    if (query.errorOnly === 'true') {
      where.OR = [{ statusCode: { gte: 400 } }, { errorCode: { not: null } }];
    }

    return where;
  }

  private resolveTimeRange(from?: string, to?: string): TimeRange {
    const parsedTo = this.parseDate(to);
    const rangeTo = parsedTo ?? new Date();

    const parsedFrom = this.parseDate(from);
    const rangeFrom =
      parsedFrom ??
      new Date(
        rangeTo.getTime() -
          REQUEST_LOG_DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000,
      );

    if (rangeFrom >= rangeTo) {
      throw new BadRequestException('`from` must be earlier than `to`');
    }

    return { from: rangeFrom, to: rangeTo };
  }

  private parseDate(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim();
    if (!ISO_DATETIME_WITH_OFFSET_PATTERN.test(normalized)) {
      throw new BadRequestException(
        `Invalid datetime format: ${value}. Use ISO 8601 with timezone offset.`,
      );
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid datetime: ${value}`);
    }

    return parsed;
  }

  private normalizeWriteInput(
    input: RequestLogWriteInput,
  ): Prisma.RequestLogUncheckedCreateInput {
    return {
      requestId: this.trimNullable(input.requestId),
      method: input.method.toUpperCase(),
      path: this.trimString(input.path, REQUEST_LOG_MAX_PATH_LENGTH),
      routeGroup: this.trimNullable(
        input.routeGroup,
        REQUEST_LOG_MAX_ROUTE_GROUP_LENGTH,
      ),
      statusCode: Math.max(0, Math.trunc(input.statusCode)),
      durationMs: Math.max(0, Math.trunc(input.durationMs)),
      authType: this.trimNullable(input.authType),
      userId: this.trimNullable(input.userId),
      apiKeyId: this.trimNullable(input.apiKeyId),
      clientIp: this.trimString(input.clientIp, 128),
      forwardedFor: this.trimNullable(input.forwardedFor, 512),
      origin: this.trimNullable(input.origin, 512),
      referer: this.trimNullable(input.referer, 512),
      userAgent: this.trimNullable(
        input.userAgent,
        REQUEST_LOG_MAX_USER_AGENT_LENGTH,
      ),
      errorCode: this.trimNullable(input.errorCode, 128),
      errorMessage: this.trimNullable(
        input.errorMessage,
        REQUEST_LOG_MAX_ERROR_MESSAGE_LENGTH,
      ),
      retryAfter: this.trimNullable(input.retryAfter, 64),
      rateLimitLimit: this.trimNullable(input.rateLimitLimit, 64),
      rateLimitRemaining: this.trimNullable(input.rateLimitRemaining, 64),
      rateLimitReset: this.trimNullable(input.rateLimitReset, 64),
      requestBytes:
        typeof input.requestBytes === 'number' &&
        Number.isFinite(input.requestBytes)
          ? Math.max(0, Math.trunc(input.requestBytes))
          : undefined,
      responseBytes:
        typeof input.responseBytes === 'number' &&
        Number.isFinite(input.responseBytes)
          ? Math.max(0, Math.trunc(input.responseBytes))
          : undefined,
    };
  }

  private trimString(value: string, maxLength: number): string {
    return value.trim().slice(0, maxLength);
  }

  private trimNullable(value?: string, maxLength = 255): string | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized.slice(0, maxLength) : undefined;
  }

  private toInt(value: unknown): number {
    const normalized =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number.parseFloat(value)
          : NaN;

    if (!Number.isFinite(normalized)) {
      return 0;
    }

    return Math.round(normalized);
  }

  private toRate(numerator: unknown, denominator: unknown): number {
    const n = this.toInt(numerator);
    const d = this.toInt(denominator);

    if (d <= 0) {
      return 0;
    }

    return Number((n / d).toFixed(4));
  }
}
