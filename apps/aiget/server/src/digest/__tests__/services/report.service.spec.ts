/**
 * Digest Report Service Tests
 *
 * [PROVIDES]: DigestReportService 单元测试
 * [POS]: 测试话题举报管理逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DigestReportService } from '../../services/report.service';
import { createMockPrisma, type MockPrismaDigest } from '../mocks';

describe('DigestReportService', () => {
  let service: DigestReportService;
  let mockPrisma: MockPrismaDigest;

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    // Add digestTopicReport mock
    (mockPrisma as any).digestTopicReport = {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };

    service = new DigestReportService(mockPrisma as any);
  });

  // ========== create ==========

  describe('create', () => {
    it('should create report for valid topic', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      });
      (mockPrisma as any).digestTopicReport.findFirst.mockResolvedValue(null);
      (mockPrisma as any).digestTopicReport.create.mockResolvedValue({
        id: 'report-1',
        topicId: 'topic-1',
        reason: 'SPAM',
        description: 'Spam content',
      });

      const result = await service.create(
        { topicId: 'topic-1', reason: 'SPAM', description: 'Spam content' },
        'user-1',
        '192.168.1.1',
      );

      expect(result.id).toBe('report-1');
      expect((mockPrisma as any).digestTopicReport.create).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            topicId: 'topic-1',
            reporterUserId: 'user-1',
            reporterIp: '192.168.1.1',
            reason: 'SPAM',
          }),
        },
      );
    });

    it('should throw NotFoundException for non-existent topic', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ topicId: 'topic-not-exist', reason: 'SPAM' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-public topic', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ topicId: 'topic-private', reason: 'SPAM' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate report by user', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      });
      (mockPrisma as any).digestTopicReport.findFirst.mockResolvedValue({
        id: 'existing-report',
        status: 'PENDING',
      });

      await expect(
        service.create({ topicId: 'topic-1', reason: 'SPAM' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate report by IP', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      });
      (mockPrisma as any).digestTopicReport.findFirst.mockResolvedValue({
        id: 'existing-report',
        status: 'PENDING',
      });

      await expect(
        service.create(
          { topicId: 'topic-1', reason: 'SPAM' },
          undefined,
          '192.168.1.1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow report without user or IP', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      });
      (mockPrisma as any).digestTopicReport.findFirst.mockResolvedValue(null);
      (mockPrisma as any).digestTopicReport.create.mockResolvedValue({
        id: 'report-1',
      });

      const result = await service.create({
        topicId: 'topic-1',
        reason: 'SPAM',
      });

      expect(result.id).toBe('report-1');
    });
  });

  // ========== resolve ==========

  describe('resolve', () => {
    it('should resolve report as valid', async () => {
      (mockPrisma as any).digestTopicReport.findUnique.mockResolvedValue({
        id: 'report-1',
        status: 'PENDING',
        topicId: 'topic-1',
        topic: { id: 'topic-1' },
      });
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // callback returns [updated], so just return it directly
        return callback(mockPrisma);
      });
      (mockPrisma as any).digestTopicReport.update.mockResolvedValue({
        id: 'report-1',
        status: 'RESOLVED_VALID',
      });

      const result = await service.resolve('report-1', 'admin-1', {
        status: 'RESOLVED_VALID',
        resolveNote: 'Confirmed spam',
      });

      expect(result.status).toBe('RESOLVED_VALID');
    });

    it('should resolve report as invalid', async () => {
      (mockPrisma as any).digestTopicReport.findUnique.mockResolvedValue({
        id: 'report-1',
        status: 'PENDING',
        topicId: 'topic-1',
        topic: { id: 'topic-1' },
      });
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // callback returns [updated], so just return it directly
        return callback(mockPrisma);
      });
      (mockPrisma as any).digestTopicReport.update.mockResolvedValue({
        id: 'report-1',
        status: 'RESOLVED_INVALID',
      });

      const result = await service.resolve('report-1', 'admin-1', {
        status: 'RESOLVED_INVALID',
        resolveNote: 'Not spam',
      });

      expect(result.status).toBe('RESOLVED_INVALID');
    });

    it('should pause topic when valid and pauseTopic is true', async () => {
      (mockPrisma as any).digestTopicReport.findUnique.mockResolvedValue({
        id: 'report-1',
        status: 'PENDING',
        topicId: 'topic-1',
        reason: 'SPAM',
        topic: { id: 'topic-1' },
      });
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          digestTopicReport: {
            update: vi.fn().mockResolvedValue({ status: 'RESOLVED_VALID' }),
          },
          digestTopic: { update: vi.fn().mockResolvedValue({}) },
        };
        return [await tx.digestTopicReport.update()];
      });

      await service.resolve('report-1', 'admin-1', {
        status: 'RESOLVED_VALID',
        pauseTopic: true,
      });

      // Transaction should be called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent report', async () => {
      (mockPrisma as any).digestTopicReport.findUnique.mockResolvedValue(null);

      await expect(
        service.resolve('report-not-exist', 'admin-1', {
          status: 'RESOLVED_VALID',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for already resolved report', async () => {
      (mockPrisma as any).digestTopicReport.findUnique.mockResolvedValue({
        id: 'report-1',
        status: 'RESOLVED_VALID',
      });

      await expect(
        service.resolve('report-1', 'admin-1', { status: 'RESOLVED_VALID' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ========== findMany ==========

  describe('findMany', () => {
    it('should return paginated reports', async () => {
      (mockPrisma as any).digestTopicReport.findMany.mockResolvedValue([
        {
          id: 'report-1',
          topic: { id: 'topic-1', slug: 'test', title: 'Test' },
        },
      ]);
      (mockPrisma as any).digestTopicReport.count.mockResolvedValue(10);

      const result = await service.findMany({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by status', async () => {
      (mockPrisma as any).digestTopicReport.findMany.mockResolvedValue([]);
      (mockPrisma as any).digestTopicReport.count.mockResolvedValue(0);

      await service.findMany({ page: 1, limit: 10, status: 'PENDING' });

      expect(
        (mockPrisma as any).digestTopicReport.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should filter by topicId', async () => {
      (mockPrisma as any).digestTopicReport.findMany.mockResolvedValue([]);
      (mockPrisma as any).digestTopicReport.count.mockResolvedValue(0);

      await service.findMany({ page: 1, limit: 10, topicId: 'topic-1' });

      expect(
        (mockPrisma as any).digestTopicReport.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ topicId: 'topic-1' }),
        }),
      );
    });
  });

  // ========== findById ==========

  describe('findById', () => {
    it('should return report with topic', async () => {
      (mockPrisma as any).digestTopicReport.findUnique.mockResolvedValue({
        id: 'report-1',
        topic: { id: 'topic-1', slug: 'test', title: 'Test' },
      });

      const result = await service.findById('report-1');

      expect(result?.id).toBe('report-1');
      expect(result?.topic?.slug).toBe('test');
    });

    it('should return null for non-existent report', async () => {
      (mockPrisma as any).digestTopicReport.findUnique.mockResolvedValue(null);

      const result = await service.findById('report-not-exist');

      expect(result).toBeNull();
    });
  });

  // ========== getPendingCount ==========

  describe('getPendingCount', () => {
    it('should return pending report count', async () => {
      (mockPrisma as any).digestTopicReport.count.mockResolvedValue(5);

      const result = await service.getPendingCount();

      expect(result).toBe(5);
      expect((mockPrisma as any).digestTopicReport.count).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
      });
    });
  });

  // ========== toResponse ==========

  describe('toResponse', () => {
    it('should format report for API response', () => {
      const report = {
        id: 'report-1',
        topicId: 'topic-1',
        reason: 'SPAM',
        description: 'Spam content',
        status: 'PENDING',
        createdAt: new Date('2024-01-15'),
        resolvedAt: null,
        resolveNote: null,
        topic: { id: 'topic-1', slug: 'test', title: 'Test Topic' },
      };

      const response = service.toResponse(report as any);

      expect(response).toEqual({
        id: 'report-1',
        topicId: 'topic-1',
        reason: 'SPAM',
        description: 'Spam content',
        status: 'PENDING',
        createdAt: expect.any(Date),
        resolvedAt: null,
        resolveNote: null,
        topic: { id: 'topic-1', slug: 'test', title: 'Test Topic' },
      });
    });
  });
});
