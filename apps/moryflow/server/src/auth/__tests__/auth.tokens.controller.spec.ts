/**
 * AuthTokensController 单元测试
 * 覆盖 refresh/logout/sign-out 的安全校验
 */

import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { AuthTokensController } from '../auth.tokens.controller';
import type { AuthTokensService } from '../auth.tokens.service';
import type { AuthService } from '../auth.service';

const createController = (overrides?: {
  tokensService?: Partial<AuthTokensService>;
  authService?: Partial<AuthService>;
}) => {
  const tokensService = {
    rotateRefreshToken: vi.fn(),
    createAccessToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    ...(overrides?.tokensService ?? {}),
  } as unknown as AuthTokensService;

  const authService = {
    getAuth: vi.fn().mockReturnValue({
      handler: vi.fn(),
      $context: {
        authCookies: {
          sessionToken: { name: 'st', options: {} },
          sessionData: { name: 'sd', options: {} },
          accountData: { name: 'ad', options: {} },
          dontRememberToken: { name: 'dr', options: {} },
        },
      },
    }),
    getSessionFromRequest: vi.fn(),
    ...(overrides?.authService ?? {}),
  } as unknown as AuthService;

  return new AuthTokensController(tokensService, authService);
};

const createReq = (headers: Record<string, string | string[]> = {}): Request =>
  ({
    headers,
    ip: '127.0.0.1',
    get: vi.fn().mockReturnValue(''),
  }) as unknown as Request;

const createRes = (): Response =>
  ({
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    setHeader: vi.fn(),
    getHeader: vi.fn(),
    status: vi.fn(),
    send: vi.fn(),
    end: vi.fn(),
  }) as unknown as Response;

describe('AuthTokensController', () => {
  const mockToken = 'refresh_token_example_1234567890';

  it('refresh should reject device token without X-App-Platform', async () => {
    const controller = createController();
    const req = createReq();
    const res = createRes();

    await expect(
      controller.refresh(req, res, { refreshToken: mockToken }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refresh should reject missing origin on web request', async () => {
    const controller = createController();
    const req = createReq({ cookie: 'mf_refresh_token=token' });
    const res = createRes();

    await expect(controller.refresh(req, res, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refresh should allow device request with invalid origin', async () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const controller = createController({
      tokensService: {
        rotateRefreshToken: vi.fn().mockResolvedValue({
          user: { id: 'user-1' },
          refreshToken: { token: 'new-refresh', expiresAt },
        }),
        createAccessToken: vi.fn().mockResolvedValue({
          token: 'access-token',
          expiresAt,
        }),
      },
    });
    const req = createReq({ origin: 'null', 'x-app-platform': 'ios' });
    const res = createRes();

    const result = await controller.refresh(req, res, {
      refreshToken: mockToken,
    });

    expect(result.accessToken).toBe('access-token');
  });

  it('logout should reject device token without X-App-Platform', async () => {
    const controller = createController();
    const req = createReq();
    const res = createRes();

    await expect(
      controller.logout(req, res, { refreshToken: mockToken }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sign-out should reject device token without X-App-Platform', async () => {
    const controller = createController();
    const req = createReq();
    const res = createRes();

    await expect(
      controller.signOut(req, res, { refreshToken: mockToken }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
