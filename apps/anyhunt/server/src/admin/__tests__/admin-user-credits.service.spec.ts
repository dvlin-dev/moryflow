/**
 * AdminUserCreditsService 单元测试
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminUserCreditsService } from '../admin-user-credits.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('AdminUserCreditsService', () => {
  let service: AdminUserCreditsService;
  let mockPrisma: {
    user: {
      findUnique: Mock;
    };
    quota: {
      create: Mock;
      update: Mock;
    };
    quotaTransaction: {
      create: Mock;
      findMany: Mock;
    };
    adminAuditLog: {
      create: Mock;
    };
    $transaction: Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      quota: {
        create: vi.fn(),
        update: vi.fn(),
      },
      quotaTransaction: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      adminAuditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    service = new AdminUserCreditsService(
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('grantCredits', () => {
    it('should create quota (if missing), grant credits, and write transaction + audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        deletedAt: null,
        subscription: { tier: 'FREE', status: 'ACTIVE' },
        quota: null,
      });

      mockPrisma.quota.create.mockResolvedValue({
        id: 'q1',
        purchasedQuota: 10,
      });
      mockPrisma.quotaTransaction.create.mockResolvedValue({ id: 't1' });
      mockPrisma.adminAuditLog.create.mockResolvedValue({ id: 'a1' });

      const result = await service.grantCredits({
        actorUserId: 'admin1',
        targetUserId: 'u1',
        amount: 10,
        reason: 'internal testing',
      });

      expect(result).toEqual({
        userId: 'u1',
        amount: 10,
        purchasedQuotaBefore: 0,
        purchasedQuotaAfter: 10,
        quotaTransactionId: 't1',
        auditLogId: 'a1',
      });

      expect(mockPrisma.quota.update).not.toHaveBeenCalled();
      expect(mockPrisma.quotaTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            actorUserId: 'admin1',
            type: 'ADMIN_GRANT',
            amount: 10,
            source: 'PURCHASED',
            balanceBefore: 0,
            balanceAfter: 10,
            reason: 'internal testing',
          }),
        }),
      );

      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId: 'admin1',
            targetUserId: 'u1',
            action: 'CREDITS_GRANT',
            reason: 'internal testing',
            metadata: expect.objectContaining({
              amount: 10,
              purchasedQuotaBefore: 0,
              purchasedQuotaAfter: 10,
              quotaTransactionId: 't1',
            }),
          }),
        }),
      );
    });

    it('should increment purchasedQuota when quota exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        deletedAt: null,
        subscription: { tier: 'FREE', status: 'ACTIVE' },
        quota: { id: 'q1', purchasedQuota: 7 },
      });

      mockPrisma.quota.update.mockResolvedValue({ purchasedQuota: 12 });
      mockPrisma.quotaTransaction.create.mockResolvedValue({ id: 't1' });
      mockPrisma.adminAuditLog.create.mockResolvedValue({ id: 'a1' });

      const result = await service.grantCredits({
        actorUserId: 'admin1',
        targetUserId: 'u1',
        amount: 5,
        reason: 'top up',
      });

      expect(result.purchasedQuotaBefore).toBe(7);
      expect(result.purchasedQuotaAfter).toBe(12);
      expect(mockPrisma.quota.create).not.toHaveBeenCalled();
    });

    it('should reject invalid amount', async () => {
      await expect(
        service.grantCredits({
          actorUserId: 'admin1',
          targetUserId: 'u1',
          amount: 0,
          reason: 'internal',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject blank reason', async () => {
      await expect(
        service.grantCredits({
          actorUserId: 'admin1',
          targetUserId: 'u1',
          amount: 10,
          reason: '   ',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw NotFoundException when user is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.grantCredits({
          actorUserId: 'admin1',
          targetUserId: 'missing',
          amount: 10,
          reason: 'internal',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw NotFoundException when user is deleted', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        deletedAt: new Date(),
        subscription: { tier: 'FREE', status: 'ACTIVE' },
        quota: null,
      });

      await expect(
        service.grantCredits({
          actorUserId: 'admin1',
          targetUserId: 'u1',
          amount: 10,
          reason: 'internal',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listCreditGrants', () => {
    it('should return recent grants', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        deletedAt: null,
      });
      mockPrisma.quotaTransaction.findMany.mockResolvedValue([
        {
          id: 't1',
          createdAt: new Date('2026-01-18T00:00:00Z'),
          actorUserId: 'admin1',
          amount: 10,
          balanceBefore: 0,
          balanceAfter: 10,
          reason: 'internal',
        },
      ]);

      const result = await service.listCreditGrants({
        userId: 'u1',
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
      expect(mockPrisma.quotaTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'u1',
            type: 'ADMIN_GRANT',
            source: 'PURCHASED',
          }),
          take: 10,
        }),
      );
    });

    it('should throw NotFoundException when user is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.listCreditGrants({ userId: 'missing', limit: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
