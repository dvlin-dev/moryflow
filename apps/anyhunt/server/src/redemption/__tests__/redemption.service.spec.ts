import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma-main/client';
import { RedemptionService } from '../redemption.service';
import type { PrismaService } from '../../prisma/prisma.service';

vi.mock('../../payment/subscription-activation', () => ({
  activateSubscriptionWithQuota: vi.fn(),
}));

import { activateSubscriptionWithQuota } from '../../payment/subscription-activation';

const mockActivate = activateSubscriptionWithQuota as Mock;

describe('RedemptionService', () => {
  let service: RedemptionService;
  let mockPrisma: {
    redemptionCode: {
      create: Mock;
      findUnique: Mock;
      updateMany: Mock;
    };
    redemptionCodeUsage: {
      create: Mock;
    };
    quota: {
      findUnique: Mock;
      findUniqueOrThrow: Mock;
      create: Mock;
      update: Mock;
    };
    quotaTransaction: {
      create: Mock;
    };
    adminAuditLog: {
      create: Mock;
    };
    $transaction: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      redemptionCode: {
        create: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      redemptionCodeUsage: {
        create: vi.fn(),
      },
      quota: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      quotaTransaction: {
        create: vi.fn(),
      },
      adminAuditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    service = new RedemptionService(mockPrisma as unknown as PrismaService);
  });

  describe('createCode', () => {
    it('should auto-generate code when none provided', async () => {
      // First findUnique returns null (generated code is unique)
      mockPrisma.redemptionCode.findUnique.mockResolvedValue(null);
      mockPrisma.redemptionCode.create.mockResolvedValue({
        id: 'rc1',
        code: 'MF-ABCD-1234',
        type: 'CREDITS',
      });

      const result = await service.createCode('admin1', {
        type: 'CREDITS',
        creditsAmount: 100,
        maxRedemptions: 1,
        membershipDays: 30,
      });

      expect(result.id).toBe('rc1');
      // Code was auto-generated: create was called with a code matching MF-XXXX-XXXX
      const createCall = mockPrisma.redemptionCode.create.mock.calls[0][0];
      expect(createCall.data.code).toMatch(/^MF-[A-F0-9]{4}-[A-F0-9]{4}$/);
    });

    it('should use provided code', async () => {
      mockPrisma.redemptionCode.create.mockResolvedValue({
        id: 'rc1',
        code: 'CUSTOM-CODE',
        type: 'CREDITS',
      });

      await service.createCode('admin1', {
        type: 'CREDITS',
        creditsAmount: 50,
        code: 'CUSTOM-CODE',
        maxRedemptions: 1,
        membershipDays: 30,
      });

      const createCall = mockPrisma.redemptionCode.create.mock.calls[0][0];
      expect(createCall.data.code).toBe('CUSTOM-CODE');
      expect(createCall.data.createdBy).toBe('admin1');
      // findUnique should not be called (no need to check uniqueness)
      expect(mockPrisma.redemptionCode.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('redeemCode', () => {
    const creditsCode = {
      id: 'rc1',
      code: 'TEST-CODE',
      type: 'CREDITS',
      creditsAmount: 100,
      membershipTier: null,
      membershipDays: null,
      maxRedemptions: 10,
      currentRedemptions: 2,
      isActive: true,
      expiresAt: null,
    };

    it('CREDITS — normal flow: increments counter, creates usage, upserts quota, creates transaction', async () => {
      mockPrisma.redemptionCode.findUnique.mockResolvedValue(creditsCode);
      mockPrisma.redemptionCode.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.redemptionCodeUsage.create.mockResolvedValue({ id: 'u1' });
      mockPrisma.quota.findUnique.mockResolvedValue({
        purchasedQuota: 50,
      });
      mockPrisma.quota.update.mockResolvedValue({ purchasedQuota: 150 });
      mockPrisma.quota.findUniqueOrThrow.mockResolvedValue({
        purchasedQuota: 150,
      });
      mockPrisma.quotaTransaction.create.mockResolvedValue({ id: 't1' });
      mockPrisma.adminAuditLog.create.mockResolvedValue({ id: 'a1' });

      const result = await service.redeemCode('user1', ' test-code ');

      expect(result).toEqual({
        type: 'CREDITS',
        creditsAmount: 100,
      });

      // Code is normalized to uppercase and trimmed
      expect(mockPrisma.redemptionCode.findUnique).toHaveBeenCalledWith({
        where: { code: 'TEST-CODE' },
      });

      // Optimistic concurrency increment
      expect(mockPrisma.redemptionCode.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'rc1',
          currentRedemptions: { lt: 10 },
          isActive: true,
        },
        data: { currentRedemptions: { increment: 1 } },
      });

      // Usage record
      expect(mockPrisma.redemptionCodeUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            redemptionCodeId: 'rc1',
            userId: 'user1',
            type: 'CREDITS',
            creditsAmount: 100,
          }),
        }),
      );

      // Quota was updated (existing quota)
      expect(mockPrisma.quota.update).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        data: { purchasedQuota: { increment: 100 } },
      });

      // Transaction record
      expect(mockPrisma.quotaTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user1',
            type: 'ADMIN_GRANT',
            amount: 100,
            source: 'PURCHASED',
            balanceBefore: 50,
            balanceAfter: 150,
          }),
        }),
      );

      // Audit log
      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId: 'user1',
            targetUserId: 'user1',
            action: 'CODE_REDEEM',
          }),
        }),
      );
    });

    it('CREDITS — creates quota record when none exists', async () => {
      mockPrisma.redemptionCode.findUnique.mockResolvedValue(creditsCode);
      mockPrisma.redemptionCode.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.redemptionCodeUsage.create.mockResolvedValue({ id: 'u1' });
      mockPrisma.quota.findUnique.mockResolvedValue(null);
      mockPrisma.quota.create.mockResolvedValue({ purchasedQuota: 100 });
      mockPrisma.quota.findUniqueOrThrow.mockResolvedValue({
        purchasedQuota: 100,
      });
      mockPrisma.quotaTransaction.create.mockResolvedValue({ id: 't1' });
      mockPrisma.adminAuditLog.create.mockResolvedValue({ id: 'a1' });

      const result = await service.redeemCode('user1', 'TEST-CODE');

      expect(result.type).toBe('CREDITS');

      // Should create quota, not update
      expect(mockPrisma.quota.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user1',
            purchasedQuota: 100,
          }),
        }),
      );
      expect(mockPrisma.quota.update).not.toHaveBeenCalled();
    });

    it('MEMBERSHIP — calls activateSubscriptionWithQuota', async () => {
      const membershipCode = {
        id: 'rc2',
        code: 'VIP-CODE',
        type: 'MEMBERSHIP',
        creditsAmount: null,
        membershipTier: 'PRO',
        membershipDays: 30,
        maxRedemptions: 5,
        currentRedemptions: 0,
        isActive: true,
        expiresAt: null,
      };

      mockPrisma.redemptionCode.findUnique.mockResolvedValue(membershipCode);
      mockPrisma.redemptionCode.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.redemptionCodeUsage.create.mockResolvedValue({ id: 'u1' });
      mockActivate.mockResolvedValue(undefined);
      mockPrisma.adminAuditLog.create.mockResolvedValue({ id: 'a1' });

      const result = await service.redeemCode('user1', 'VIP-CODE');

      expect(result).toEqual({
        type: 'MEMBERSHIP',
        membershipTier: 'PRO',
        membershipDays: 30,
      });

      expect(mockActivate).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          userId: 'user1',
          tier: 'PRO',
        }),
      );
    });

    it('should throw BadRequestException for expired code', async () => {
      mockPrisma.redemptionCode.findUnique.mockResolvedValue({
        ...creditsCode,
        expiresAt: new Date('2020-01-01'),
      });

      await expect(
        service.redeemCode('user1', 'TEST-CODE'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException for inactive code', async () => {
      mockPrisma.redemptionCode.findUnique.mockResolvedValue({
        ...creditsCode,
        isActive: false,
      });

      await expect(
        service.redeemCode('user1', 'TEST-CODE'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when max redemptions reached', async () => {
      mockPrisma.redemptionCode.findUnique.mockResolvedValue(creditsCode);
      mockPrisma.redemptionCode.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.redeemCode('user1', 'TEST-CODE'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw ConflictException on duplicate redemption (P2002)', async () => {
      mockPrisma.redemptionCode.findUnique.mockResolvedValue(creditsCode);
      mockPrisma.redemptionCode.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.redemptionCodeUsage.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.redeemCode('user1', 'TEST-CODE'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
