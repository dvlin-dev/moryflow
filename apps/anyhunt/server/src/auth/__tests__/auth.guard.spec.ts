/**
 * AuthGuard 单元测试
 */

import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../auth.guard';
import type { AuthTokensService } from '../auth.tokens.service';

describe('AuthGuard', () => {
  const createContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    }) as any;

  it('should allow public routes', async () => {
    const guard = new AuthGuard(
      {
        verifyAccessToken: vi.fn(),
      } as unknown as AuthTokensService,
      {
        getAllAndOverride: vi.fn().mockReturnValue(true),
      } as any,
    );

    const result = await guard.canActivate(createContext({ headers: {} }));

    expect(result).toBe(true);
  });

  it('should reject missing bearer token', async () => {
    const guard = new AuthGuard(
      {
        verifyAccessToken: vi.fn(),
      } as unknown as AuthTokensService,
      {
        getAllAndOverride: vi.fn().mockReturnValue(false),
      } as any,
    );

    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should attach user when token is valid', async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue({
      session: { id: 'session_1', expiresAt: new Date() },
      user: {
        id: 'user_1',
        email: 'user@example.com',
        name: 'User',
        tier: 'FREE',
        isAdmin: false,
      },
    });

    const guard = new AuthGuard(
      { verifyAccessToken } as unknown as AuthTokensService,
      {
        getAllAndOverride: vi.fn().mockReturnValue(false),
      } as any,
    );

    const request = { headers: { authorization: 'Bearer token' } } as any;
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user?.id).toBe('user_1');
    expect(request.session?.id).toBe('session_1');
  });
});
