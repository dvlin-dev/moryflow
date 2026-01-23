/**
 * AuthTokensService 单元测试
 * 覆盖 access/refresh token 的签发与校验路径
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthService } from '../auth.service';
import { AuthTokensService } from '../auth.tokens.service';
import { ACCESS_TOKEN_TTL_SECONDS } from '../auth.constants';

describe('AuthTokensService', () => {
  let service: AuthTokensService;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    refreshToken: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    getAuth: ReturnType<typeof vi.fn>;
  };
  let mockSignJWT: ReturnType<typeof vi.fn>;
  let mockVerifyJWT: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn() },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockSignJWT = vi.fn();
    mockVerifyJWT = vi.fn();
    mockAuthService = {
      getAuth: vi.fn().mockReturnValue({
        api: {
          signJWT: mockSignJWT,
          verifyJWT: mockVerifyJWT,
        },
      }),
    };

    service = new AuthTokensService(
      mockPrisma as unknown as PrismaService,
      mockAuthService as unknown as AuthService,
    );

    vi.clearAllMocks();
  });

  it('should create access token with ttl', async () => {
    mockSignJWT.mockResolvedValue({ token: 'access-token' });

    const now = Date.now();
    const result = await service.createAccessToken('user_1');

    expect(result.token).toBe('access-token');
    expect(result.expiresAt.getTime()).toBeGreaterThan(now);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
      now + ACCESS_TOKEN_TTL_SECONDS * 1000 + 1000,
    );
  });

  it('should return null for invalid access token', async () => {
    mockVerifyJWT.mockResolvedValue({ payload: null });

    const result = await service.verifyAccessToken('bad-token');

    expect(result).toBeNull();
  });

  it('should return null when access token is missing exp', async () => {
    mockVerifyJWT.mockResolvedValue({
      payload: {
        sub: 'user_1',
        tokenType: 'access',
      },
    });

    const result = await service.verifyAccessToken('missing-exp');

    expect(result).toBeNull();
  });

  it('should return user for valid access token', async () => {
    mockVerifyJWT.mockResolvedValue({
      payload: {
        sub: 'user_1',
        aud: 'https://server.anyhunt.app',
        tokenType: 'access',
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: 'jti_1',
      },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      name: 'User',
      isAdmin: false,
      deletedAt: null,
      subscription: { tier: 'FREE' },
    });

    const result = await service.verifyAccessToken('good-token');

    expect(result?.user.id).toBe('user_1');
    expect(result?.session.id).toBe('jti_1');
  });

  it('should rotate refresh token', async () => {
    const now = new Date();
    const record = {
      id: 'rt_1',
      userId: 'user_1',
      expiresAt: new Date(now.getTime() + 1000),
      revokedAt: null,
      user: {
        id: 'user_1',
        email: 'user@example.com',
        name: 'User',
        isAdmin: false,
        deletedAt: null,
        subscription: { tier: 'FREE' },
      },
    };

    const tx = {
      refreshToken: {
        findUnique: vi.fn().mockResolvedValue(record),
        create: vi.fn().mockResolvedValue({ id: 'rt_2' }),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (fn) => fn(tx));
    tx.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.rotateRefreshToken('raw-token', {
      ipAddress: '127.0.0.1',
      userAgent: 'test',
    });

    expect(result?.user.id).toBe('user_1');
    expect(result?.refreshToken.token).toBeTruthy();
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'rt_1' }),
      }),
    );
  });

  it('should revoke newly created token when rotation fails', async () => {
    const now = new Date();
    const record = {
      id: 'rt_1',
      userId: 'user_1',
      expiresAt: new Date(now.getTime() + 1000),
      revokedAt: null,
      user: {
        id: 'user_1',
        email: 'user@example.com',
        name: 'User',
        isAdmin: false,
        deletedAt: null,
        subscription: { tier: 'FREE' },
      },
    };

    const tx = {
      refreshToken: {
        findUnique: vi.fn().mockResolvedValue(record),
        create: vi.fn().mockResolvedValue({ id: 'rt_2' }),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (fn) => fn(tx));

    const result = await service.rotateRefreshToken('raw-token', {
      ipAddress: '127.0.0.1',
      userAgent: 'test',
    });

    expect(result).toBeNull();
    expect(tx.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rt_2' } }),
    );
  });
});
