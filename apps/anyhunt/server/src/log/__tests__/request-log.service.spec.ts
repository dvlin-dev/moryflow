import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma';
import { RequestLogService } from '../request-log.service';

describe('RequestLogService', () => {
  let service: RequestLogService;
  let mockPrisma: {
    requestLog: {
      create: Mock;
      findMany: Mock;
      count: Mock;
      deleteMany: Mock;
    };
    $queryRaw: Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      requestLog: {
        create: vi.fn().mockResolvedValue(undefined),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $queryRaw: vi.fn(),
    };

    service = new RequestLogService(mockPrisma as unknown as PrismaService);
  });

  it('should persist request log asynchronously', async () => {
    service.writeAsync({
      method: 'get',
      path: '/api/v1/agent',
      statusCode: 200,
      durationMs: 123,
      clientIp: '127.0.0.1',
      errorMessage: ' '.repeat(3) + 'sample error',
    });

    await Promise.resolve();

    expect(mockPrisma.requestLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          method: 'GET',
          path: '/api/v1/agent',
          statusCode: 200,
          durationMs: 123,
          clientIp: '127.0.0.1',
          errorMessage: 'sample error',
        }),
      }),
    );
  });

  it('should return paginated request logs', async () => {
    const createdAt = new Date('2026-02-24T00:00:00.000Z');
    mockPrisma.requestLog.findMany.mockResolvedValue([
      {
        id: 'log_1',
        createdAt,
        requestId: 'req_1',
        method: 'GET',
        path: '/api/v1/agent',
        routeGroup: 'agent',
        statusCode: 200,
        durationMs: 12,
        authType: 'apiKey',
        userId: 'user_1',
        apiKeyId: 'key_1',
        clientIp: '1.1.1.1',
        forwardedFor: null,
        origin: null,
        referer: null,
        userAgent: null,
        errorCode: null,
        errorMessage: null,
        retryAfter: null,
        rateLimitLimit: null,
        rateLimitRemaining: null,
        rateLimitReset: null,
        requestBytes: null,
        responseBytes: null,
      },
    ]);
    mockPrisma.requestLog.count.mockResolvedValue(1);

    const result = await service.getRequests({
      page: 1,
      limit: 20,
      from: '2026-02-23T00:00:00.000Z',
      to: '2026-02-25T00:00:00.000Z',
    });

    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('should throw on invalid time range', async () => {
    await expect(
      service.getRequests({
        page: 1,
        limit: 20,
        from: '2026-02-25T00:00:00.000Z',
        to: '2026-02-24T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject datetime without timezone offset', async () => {
    await expect(
      service.getRequests({
        page: 1,
        limit: 20,
        from: '2026-02-24T08:00:00',
        to: '2026-02-25T08:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should aggregate overview metrics', async () => {
    mockPrisma.requestLog.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(20);

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ p95DurationMs: 456 }])
      .mockResolvedValueOnce([
        {
          routeGroup: 'agent',
          requestCount: 70,
          errorCount: 14,
          avgDurationMs: 120,
        },
      ])
      .mockResolvedValueOnce([{ errorCode: 'HTTP_429', count: 10 }]);

    const result = await service.getOverview({
      from: '2026-02-20T00:00:00.000Z',
      to: '2026-02-24T00:00:00.000Z',
    });

    expect(result.totalRequests).toBe(100);
    expect(result.errorRequests).toBe(20);
    expect(result.errorRate).toBe(0.2);
    expect(result.p95DurationMs).toBe(456);
    expect(result.topRoutes[0]).toMatchObject({
      routeGroup: 'agent',
      requestCount: 70,
      errorCount: 14,
    });
    expect(result.topErrorCodes[0]).toEqual({
      errorCode: 'HTTP_429',
      count: 10,
    });
  });
});
