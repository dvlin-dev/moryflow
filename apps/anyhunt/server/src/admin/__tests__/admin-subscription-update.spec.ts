/**
 * AdminService.updateSubscription unit tests
 * Covers tier change, status transitions, priority rules, no-op, and not-found
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from '../admin.service';
import type { PrismaService } from '../../prisma/prisma.service';

vi.mock('../../payment/subscription-activation', () => ({
  activateSubscriptionWithQuota: vi.fn(),
  deactivateSubscriptionToFree: vi.fn(),
}));

import {
  activateSubscriptionWithQuota,
  deactivateSubscriptionToFree,
} from '../../payment/subscription-activation';

const mockedActivate = activateSubscriptionWithQuota as Mock;
const mockedDeactivate = deactivateSubscriptionToFree as Mock;

describe('AdminService.updateSubscription', () => {
  let service: AdminService;
  let mockPrisma: {
    subscription: {
      findUnique: Mock;
      findUniqueOrThrow: Mock;
      update: Mock;
    };
    adminAuditLog: { create: Mock };
    $transaction: Mock;
  };

  const baseSub = {
    id: 'sub_1',
    userId: 'user_1',
    tier: 'PRO',
    status: 'ACTIVE',
    user: { id: 'user_1', email: 'test@example.com', name: 'Test' },
  };

  const returnedSub = {
    ...baseSub,
    user: { id: 'user_1', email: 'test@example.com', name: 'Test' },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      subscription: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn().mockResolvedValue(returnedSub),
        update: vi.fn(),
      },
      adminAuditLog: { create: vi.fn() },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    service = new AdminService(mockPrisma as unknown as PrismaService);
  });

  it('tier change — calls activateSubscriptionWithQuota and creates AuditLog', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub);
    mockPrisma.subscription.findUniqueOrThrow.mockResolvedValue({
      ...returnedSub,
      tier: 'TEAM',
    });

    const result = await service.updateSubscription(
      'sub_1',
      { tier: 'TEAM' },
      'admin_1',
    );

    expect(mockedActivate).toHaveBeenCalledOnce();
    expect(mockedActivate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        userId: 'user_1',
        tier: 'TEAM',
      }),
    );
    expect(mockedDeactivate).not.toHaveBeenCalled();
    expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'admin_1',
        targetUserId: 'user_1',
        action: 'SUBSCRIPTION_UPDATE',
        metadata: expect.objectContaining({
          oldTier: 'PRO',
          newTier: 'TEAM',
        }),
      }),
    });
    expect(result.tier).toBe('TEAM');
  });

  it('status → EXPIRED — calls deactivateSubscriptionToFree with EXPIRED status', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub);

    await service.updateSubscription('sub_1', { status: 'EXPIRED' }, 'admin_1');

    expect(mockedDeactivate).toHaveBeenCalledOnce();
    expect(mockedDeactivate).toHaveBeenCalledWith(mockPrisma, {
      userId: 'user_1',
      status: 'EXPIRED',
    });
    expect(mockedActivate).not.toHaveBeenCalled();
    expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledOnce();
  });

  it('status → CANCELED — updates with cancelAtPeriodEnd=true, does NOT touch quota', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub);

    await service.updateSubscription(
      'sub_1',
      { status: 'CANCELED' },
      'admin_1',
    );

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: { status: 'CANCELED', cancelAtPeriodEnd: true },
    });
    expect(mockedActivate).not.toHaveBeenCalled();
    expect(mockedDeactivate).not.toHaveBeenCalled();
    expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledOnce();
  });

  it('tier + status=EXPIRED simultaneous — status takes priority, deactivates to FREE', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub);

    await service.updateSubscription(
      'sub_1',
      { tier: 'TEAM', status: 'EXPIRED' },
      'admin_1',
    );

    expect(mockedDeactivate).toHaveBeenCalledOnce();
    expect(mockedDeactivate).toHaveBeenCalledWith(mockPrisma, {
      userId: 'user_1',
      status: 'EXPIRED',
    });
    expect(mockedActivate).not.toHaveBeenCalled();
  });

  it('tier unchanged, status unchanged — no changes, no AuditLog', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub);

    await service.updateSubscription(
      'sub_1',
      { tier: 'PRO', status: 'ACTIVE' },
      'admin_1',
    );

    expect(mockedActivate).not.toHaveBeenCalled();
    expect(mockedDeactivate).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    expect(mockPrisma.adminAuditLog.create).not.toHaveBeenCalled();
  });

  it('subscription not found — throws NotFoundException', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    await expect(
      service.updateSubscription('non_existent', { tier: 'PRO' }, 'admin_1'),
    ).rejects.toThrow(NotFoundException);

    expect(mockedActivate).not.toHaveBeenCalled();
    expect(mockedDeactivate).not.toHaveBeenCalled();
  });
});
