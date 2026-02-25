/**
 * AuthController 单元测试
 * 覆盖 Better Auth 登录响应改写为 Token-first 的关键路径
 */

import { describe, expect, it, vi } from 'vitest';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthController } from '../auth.controller';
import type { AuthService } from '../auth.service';
import type { AuthTokensService } from '../auth.tokens.service';

const createReq = (path: string): ExpressRequest =>
  ({
    originalUrl: path,
    protocol: 'https',
    method: 'POST',
    headers: {},
    body: {},
    ip: '127.0.0.1',
    get: vi.fn((name: string) => {
      if (name.toLowerCase() === 'host') {
        return 'server.moryflow.com';
      }
      if (name.toLowerCase() === 'user-agent') {
        return 'vitest-agent';
      }
      return undefined;
    }),
  }) as unknown as ExpressRequest;

const createRes = (): {
  res: ExpressResponse;
  statusSpy: ReturnType<typeof vi.fn>;
  jsonSpy: ReturnType<typeof vi.fn>;
  sendSpy: ReturnType<typeof vi.fn>;
} => {
  const statusSpy = vi.fn();
  const jsonSpy = vi.fn();
  const sendSpy = vi.fn();
  const res = {
    setHeader: vi.fn(),
    getHeader: vi.fn().mockReturnValue(undefined),
    status: statusSpy,
    json: jsonSpy,
    send: sendSpy,
    end: vi.fn(),
  } as unknown as ExpressResponse;

  statusSpy.mockReturnValue(res);
  return { res, statusSpy, jsonSpy, sendSpy };
};

describe('AuthController', () => {
  it('should return token-first payload for sign-in/email', async () => {
    const authHandler = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 'user_1',
            email: 'user@example.com',
            emailVerified: true,
            name: 'Demo',
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'better-auth-cookie=1; Path=/',
          },
        },
      ),
    );

    const authService = {
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;

    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const createAccessTokenSpy = vi.fn().mockResolvedValue({
      token: 'access_1',
      expiresAt,
    });
    const issueRefreshTokenSpy = vi.fn().mockResolvedValue({
      token: 'refresh_1',
      expiresAt,
    });
    const tokensService = {
      createAccessToken: createAccessTokenSpy,
      issueRefreshToken: issueRefreshTokenSpy,
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/sign-in/email');
    const { res, statusSpy, jsonSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith({
      status: true,
      accessToken: 'access_1',
      accessTokenExpiresAt: expiresAt.toISOString(),
      refreshToken: 'refresh_1',
      refreshTokenExpiresAt: expiresAt.toISOString(),
      user: {
        id: 'user_1',
        email: 'user@example.com',
        emailVerified: true,
        name: 'Demo',
      },
    });
    expect(issueRefreshTokenSpy).toHaveBeenCalledWith('user_1', {
      ipAddress: '127.0.0.1',
      userAgent: 'vitest-agent',
    });
  });

  it('should return token-first payload for email-otp/verify-email', async () => {
    const authHandler = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 'user_verify_1',
            email: 'verify@example.com',
            emailVerified: true,
            name: 'Verify User',
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    const authService = {
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;

    const expiresAt = new Date('2031-01-01T00:00:00.000Z');
    const createAccessTokenSpy = vi.fn().mockResolvedValue({
      token: 'access_verify_1',
      expiresAt,
    });
    const issueRefreshTokenSpy = vi.fn().mockResolvedValue({
      token: 'refresh_verify_1',
      expiresAt,
    });
    const tokensService = {
      createAccessToken: createAccessTokenSpy,
      issueRefreshToken: issueRefreshTokenSpy,
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/email-otp/verify-email');
    const { res, statusSpy, jsonSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith({
      status: true,
      accessToken: 'access_verify_1',
      accessTokenExpiresAt: expiresAt.toISOString(),
      refreshToken: 'refresh_verify_1',
      refreshTokenExpiresAt: expiresAt.toISOString(),
      user: {
        id: 'user_verify_1',
        email: 'verify@example.com',
        emailVerified: true,
        name: 'Verify User',
      },
    });
    expect(createAccessTokenSpy).toHaveBeenCalledWith('user_verify_1');
    expect(issueRefreshTokenSpy).toHaveBeenCalledWith('user_verify_1', {
      ipAddress: '127.0.0.1',
      userAgent: 'vitest-agent',
    });
  });

  it('should passthrough non-tokenized auth endpoints', async () => {
    const authHandler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    const authService = {
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;

    const createAccessTokenSpy = vi.fn();
    const issueRefreshTokenSpy = vi.fn();
    const tokensService = {
      createAccessToken: createAccessTokenSpy,
      issueRefreshToken: issueRefreshTokenSpy,
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/sign-up/email');
    const { res, sendSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ status: true }));
    expect(createAccessTokenSpy).not.toHaveBeenCalled();
    expect(issueRefreshTokenSpy).not.toHaveBeenCalled();
  });
});
