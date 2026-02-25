/**
 * AuthTokensController 单元测试
 * 覆盖 refresh/logout/sign-out 的 Token-first 逻辑
 */

import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { AuthTokensController } from '../auth.tokens.controller';
import type { AuthTokensService } from '../auth.tokens.service';

const createController = (overrides?: {
  tokensService?: Partial<AuthTokensService>;
}) => {
  const tokensService = {
    rotateRefreshToken: vi.fn(),
    createAccessToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    ...(overrides?.tokensService ?? {}),
  } as unknown as AuthTokensService;

  return new AuthTokensController(tokensService);
};

const createReq = (): Request =>
  ({
    headers: {},
    ip: '127.0.0.1',
    get: vi.fn((name: string) =>
      name.toLowerCase() === 'user-agent' ? 'vitest-agent' : undefined,
    ),
  }) as unknown as Request;

const createRes = (): Response =>
  ({
    setHeader: vi.fn(),
  }) as unknown as Response;

describe('AuthTokensController', () => {
  const mockToken = 'refresh_token_example_1234567890';

  it('refresh should rotate token and return new access + refresh pair', async () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const controller = createController();
    const req = createReq();
    const res = createRes();
    const rotateRefreshToken = vi
      .spyOn(controller['tokensService'], 'rotateRefreshToken')
      .mockResolvedValue({
        user: {
          id: 'user_1',
          email: 'user@example.com',
          name: 'demo',
          subscriptionTier: 'FREE',
          isAdmin: false,
        },
        refreshToken: {
          token: 'new_refresh',
          expiresAt,
        },
      });
    vi.spyOn(
      controller['tokensService'],
      'createAccessToken',
    ).mockResolvedValue({
      token: 'new_access',
      expiresAt,
    });

    const result = await controller.refresh(req, res, {
      refreshToken: mockToken,
    });
    expect(result).toEqual({
      accessToken: 'new_access',
      accessTokenExpiresAt: expiresAt.toISOString(),
      refreshToken: 'new_refresh',
      refreshTokenExpiresAt: expiresAt.toISOString(),
    });
    expect(rotateRefreshToken).toHaveBeenCalledWith(mockToken, {
      ipAddress: '127.0.0.1',
      userAgent: 'vitest-agent',
    });
  });

  it('refresh should reject invalid refresh token', async () => {
    const controller = createController();
    const req = createReq();
    const res = createRes();
    vi.spyOn(
      controller['tokensService'],
      'rotateRefreshToken',
    ).mockResolvedValue(null);

    await expect(
      controller.refresh(req, res, { refreshToken: mockToken }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout should revoke provided refresh token', async () => {
    const controller = createController();
    const res = createRes();
    const revokeRefreshToken = vi.spyOn(
      controller['tokensService'],
      'revokeRefreshToken',
    );

    const result = await controller.logout(res, {
      refreshToken: mockToken,
    });
    expect(result).toEqual({ message: 'Logout successful' });
    expect(revokeRefreshToken).toHaveBeenCalledWith(mockToken);
  });

  it('sign-out should revoke provided refresh token', async () => {
    const controller = createController();
    const res = createRes();
    const revokeRefreshToken = vi.spyOn(
      controller['tokensService'],
      'revokeRefreshToken',
    );

    const result = await controller.signOut(res, { refreshToken: mockToken });
    expect(result).toEqual({ message: 'Logout successful' });
    expect(revokeRefreshToken).toHaveBeenCalledWith(mockToken);
  });
});
