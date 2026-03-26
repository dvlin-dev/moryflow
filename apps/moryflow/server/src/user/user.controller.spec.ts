import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { UserController } from './user.controller';

describe('UserController', () => {
  const baseCurrentUser = {
    id: 'user_1',
    email: 'demo@moryflow.com',
    name: 'Demo',
    subscriptionTier: 'free' as const,
    isAdmin: false,
  };

  it('getMe should include emailVerified from current user summary', async () => {
    const creditService = {
      getCreditsBalance: vi.fn().mockResolvedValue({
        daily: 1,
        subscription: 2,
        purchased: 3,
        total: 6,
        debt: 0,
        available: 6,
      }),
    };
    const creditLedgerQueryService = {
      listUserLedger: vi.fn(),
    };
    const userService = {
      getCurrentUserSummary: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'demo@moryflow.com',
        emailVerified: true,
        name: 'Display Name',
        image: undefined,
        createdAt: '2026-03-08T00:00:00.000Z',
        subscriptionTier: 'free',
        isAdmin: false,
      }),
    };

    const controller = new UserController(
      creditService as never,
      creditLedgerQueryService as never,
      userService as never,
    );
    const result = await controller.getMe(baseCurrentUser);

    expect(result).toEqual({
      id: 'user_1',
      email: 'demo@moryflow.com',
      emailVerified: true,
      name: 'Display Name',
      image: undefined,
      createdAt: '2026-03-08T00:00:00.000Z',
      subscriptionTier: 'free',
      isAdmin: false,
      credits: {
        daily: 1,
        subscription: 2,
        purchased: 3,
        total: 6,
        debt: 0,
        available: 6,
      },
    });
  });

  it('getCreditHistory should return only the current user ledger slice', async () => {
    const creditLedgerQueryService = {
      listUserLedger: vi.fn().mockResolvedValue({
        items: [{ id: 'ledger-1', summary: 'AI chat via openai/gpt-5.4' }],
        pagination: { total: 1, limit: 20, offset: 0 },
      }),
    };
    const controller = new UserController(
      { getCreditsBalance: vi.fn() } as never,
      creditLedgerQueryService as never,
      {
        getCurrentUserSummary: vi.fn(),
      } as never,
    );

    const result = await controller.getCreditHistory(baseCurrentUser, {});

    expect(creditLedgerQueryService.listUserLedger).toHaveBeenCalledWith(
      baseCurrentUser.id,
      {
        limit: 20,
        offset: 0,
      },
    );
    expect(result.pagination.total).toBe(1);
  });

  it('updateProfile should normalize body through user service', async () => {
    const controller = new UserController(
      { getCreditsBalance: vi.fn() } as never,
      { listUserLedger: vi.fn() } as never,
      {
        getCurrentUserSummary: vi.fn(),
        updateProfile: vi.fn().mockResolvedValue({
          userId: 'user_1',
          displayName: 'Updated Name',
          avatarUrl: undefined,
        }),
      } as never,
    );

    const result = await controller.updateProfile(baseCurrentUser, {
      displayName: 'Updated Name',
    });

    expect(result).toEqual({
      userId: 'user_1',
      displayName: 'Updated Name',
      avatarUrl: undefined,
    });
  });

  it('updateProfile should reject empty patch payloads', async () => {
    const controller = new UserController(
      { getCreditsBalance: vi.fn() } as never,
      { listUserLedger: vi.fn() } as never,
      {
        getCurrentUserSummary: vi.fn(),
        updateProfile: vi.fn(),
      } as never,
    );

    await expect(
      controller.updateProfile(baseCurrentUser, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
