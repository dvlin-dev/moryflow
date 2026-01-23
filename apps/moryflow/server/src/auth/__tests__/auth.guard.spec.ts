/**
 * AuthGuard 单元测试
 */

import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthGuard } from '../auth.guard';
import type { AuthTokensService } from '../auth.tokens.service';

describe('AuthGuard', () => {
  const createContext = (request: Request): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    }) as unknown as ExecutionContext;

  it('should allow public routes', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new AuthGuard(
      {
        verifyAccessToken: vi.fn(),
      } as unknown as AuthTokensService,
      reflector,
    );

    const result = await guard.canActivate(
      createContext({ headers: {} } as Request),
    );

    expect(result).toBe(true);
  });

  it('should reject missing bearer token', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new AuthGuard(
      {
        verifyAccessToken: vi.fn(),
      } as unknown as AuthTokensService,
      reflector,
    );

    await expect(
      guard.canActivate(createContext({ headers: {} } as Request)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should attach user when token is valid', async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue({
      session: { id: 'session_1', expiresAt: new Date() },
      user: {
        id: 'user_1',
        email: 'user@example.com',
        name: 'User',
        tier: 'free',
        isAdmin: false,
      },
    });

    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new AuthGuard(
      { verifyAccessToken } as unknown as AuthTokensService,
      reflector,
    );

    const request = {
      headers: { authorization: 'Bearer token' },
    } as Request;
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user?.id).toBe('user_1');
    expect(request.session?.id).toBe('session_1');
  });
});
