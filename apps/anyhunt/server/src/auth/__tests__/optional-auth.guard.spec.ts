/**
 * OptionalAuthGuard 单元测试
 */

import { describe, expect, it, vi } from 'vitest';
import { OptionalAuthGuard } from '../optional-auth.guard';
import type { AuthTokensService } from '../auth.tokens.service';

describe('OptionalAuthGuard', () => {
  const createContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  it('should allow request without token', async () => {
    const guard = new OptionalAuthGuard({
      verifyAccessToken: vi.fn(),
    } as unknown as AuthTokensService);

    const request = { headers: {} } as any;
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('should ignore invalid token', async () => {
    const guard = new OptionalAuthGuard({
      verifyAccessToken: vi.fn().mockResolvedValue(null),
    } as unknown as AuthTokensService);

    const request = { headers: { authorization: 'Bearer bad' } } as any;
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('should attach user when token is valid', async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue({
      session: { id: 'session_1', expiresAt: new Date() },
      user: {
        id: 'user_1',
        email: 'user@example.com',
        name: 'User',
        subscriptionTier: 'FREE',
        isAdmin: false,
      },
    });

    const guard = new OptionalAuthGuard({
      verifyAccessToken,
    } as unknown as AuthTokensService);

    const request = { headers: { authorization: 'Bearer token' } } as any;
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user?.id).toBe('user_1');
    expect(request.session?.id).toBe('session_1');
  });
});
