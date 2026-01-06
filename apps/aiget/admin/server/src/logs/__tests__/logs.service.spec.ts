/**
 * LogsService 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LogsService } from '../logs.service';
import { IDENTITY_PRISMA } from '../../prisma/prisma.module';
import { createMockPrismaClient } from '../../../test/helpers/mock.factory';
import { testAdminLogs } from '../../../test/fixtures/seed';

describe('LogsService', () => {
  let service: LogsService;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogsService,
        {
          provide: IDENTITY_PRISMA,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<LogsService>(LogsService);
  });

  describe('listLogs', () => {
    it('should return paginated log list', async () => {
      const logs = [testAdminLogs.tierChange, testAdminLogs.creditGrant];
      mockPrisma.adminLog.findMany.mockResolvedValue(logs);
      mockPrisma.adminLog.count.mockResolvedValue(2);

      const result = await service.listLogs({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should filter by level', async () => {
      mockPrisma.adminLog.findMany.mockResolvedValue([testAdminLogs.tierChange]);
      mockPrisma.adminLog.count.mockResolvedValue(1);

      await service.listLogs({ page: 1, limit: 20, level: 'INFO' });

      expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            level: 'INFO',
          }),
        })
      );
    });

    it('should filter by action', async () => {
      mockPrisma.adminLog.findMany.mockResolvedValue([testAdminLogs.tierChange]);
      mockPrisma.adminLog.count.mockResolvedValue(1);

      await service.listLogs({ page: 1, limit: 20, action: 'SET_TIER' });

      expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { contains: 'SET_TIER', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should filter by adminId', async () => {
      mockPrisma.adminLog.findMany.mockResolvedValue([testAdminLogs.tierChange]);
      mockPrisma.adminLog.count.mockResolvedValue(1);

      await service.listLogs({ page: 1, limit: 20, adminId: 'admin-user-id-001' });

      expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            adminId: 'admin-user-id-001',
          }),
        })
      );
    });

    it('should filter by targetUserId', async () => {
      mockPrisma.adminLog.findMany.mockResolvedValue([testAdminLogs.tierChange]);
      mockPrisma.adminLog.count.mockResolvedValue(1);

      await service.listLogs({ page: 1, limit: 20, targetUserId: 'normal-user-id-001' });

      expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            targetUserId: 'normal-user-id-001',
          }),
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      mockPrisma.adminLog.findMany.mockResolvedValue([]);
      mockPrisma.adminLog.count.mockResolvedValue(100);

      const result = await service.listLogs({ page: 3, limit: 20 });

      expect(result.totalPages).toBe(5);
      expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        })
      );
    });

    it('should convert createdAt to ISO string', async () => {
      const log = { ...testAdminLogs.tierChange };
      mockPrisma.adminLog.findMany.mockResolvedValue([log]);
      mockPrisma.adminLog.count.mockResolvedValue(1);

      const result = await service.listLogs({ page: 1, limit: 20 });

      expect(typeof result.items[0].createdAt).toBe('string');
      expect(result.items[0].createdAt).toContain('2024-01-20');
    });
  });
});
