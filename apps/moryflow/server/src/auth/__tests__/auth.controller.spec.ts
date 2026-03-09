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
import { ManagedAuthFlowError, type AuthService } from '../auth.service';
import type { AuthTokensService } from '../auth.tokens.service';

const buildCredential = (label: string) => ['auth', label, '2026'].join('-');

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
  it('should recover repeated sign-up for existing unverified email before hitting Better Auth handler', async () => {
    const authHandler = vi.fn();
    const sendEmailVerificationOTP = vi.fn().mockResolvedValue(undefined);
    const assertManagedAuthRateLimit = vi.fn().mockResolvedValue(undefined);
    const assertEmailSignUpAllowed = vi.fn().mockResolvedValue(undefined);
    const authService = {
      assertManagedAuthRateLimit,
      assertEmailSignUpAllowed,
      recoverUnverifiedSignUp: vi.fn().mockResolvedValue({
        token: null,
        user: {
          id: 'user_recover_1',
          email: 'recover@example.com',
          name: 'Recover User',
          image: null,
          emailVerified: false,
          createdAt: new Date('2032-01-01T00:00:00.000Z'),
          updatedAt: new Date('2032-01-01T00:00:00.000Z'),
        },
      }),
      sendEmailVerificationOTP,
      consumePendingSignUpRecovery: vi.fn(),
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;

    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/sign-up/email');
    req.body = { email: 'recover@example.com' };
    const { res, statusSpy, jsonSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(sendEmailVerificationOTP).toHaveBeenCalledWith(
      'recover@example.com',
    );
    expect(assertManagedAuthRateLimit).toHaveBeenCalledWith(
      '/api/v1/auth/sign-up/email',
      '127.0.0.1',
    );
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith({
      token: null,
      user: {
        id: 'user_recover_1',
        email: 'recover@example.com',
        name: 'Recover User',
        image: null,
        emailVerified: false,
        createdAt: new Date('2032-01-01T00:00:00.000Z'),
        updatedAt: new Date('2032-01-01T00:00:00.000Z'),
      },
    });
    expect(authHandler).not.toHaveBeenCalled();
  });

  it('should send the initial verification otp after sign-up/email succeeds', async () => {
    const authHandler = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: null,
          user: {
            id: 'user_sign_up_1',
            email: 'signup@example.com',
            emailVerified: false,
            name: 'Demo',
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
    const sendEmailVerificationOTP = vi.fn().mockResolvedValue(undefined);
    const authService = {
      assertEmailSignUpAllowed: vi.fn().mockResolvedValue(undefined),
      recoverUnverifiedSignUp: vi.fn().mockResolvedValue(null),
      sendEmailVerificationOTP,
      consumePendingSignUpRecovery: vi.fn(),
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/sign-up/email');
    req.body = {
      email: 'signup@example.com',
      password: buildCredential('signup-a'),
      name: 'Demo',
    };
    const { res, sendSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(sendEmailVerificationOTP).toHaveBeenCalledWith('signup@example.com');
    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({
        token: null,
        user: {
          id: 'user_sign_up_1',
          email: 'signup@example.com',
          emailVerified: false,
          name: 'Demo',
        },
      }),
    );
  });

  it('should send the initial verification otp after sign-up/email succeeds even when payload omits user id', async () => {
    const authHandler = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: null,
          user: {
            email: 'signup-no-id@example.com',
            emailVerified: false,
            name: 'Demo',
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
    const sendEmailVerificationOTP = vi.fn().mockResolvedValue(undefined);
    const authService = {
      assertEmailSignUpAllowed: vi.fn().mockResolvedValue(undefined),
      recoverUnverifiedSignUp: vi.fn().mockResolvedValue(null),
      sendEmailVerificationOTP,
      consumePendingSignUpRecovery: vi.fn(),
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/sign-up/email');
    req.body = {
      email: 'signup-no-id@example.com',
      password: buildCredential('signup-b'),
      name: 'Demo',
    };
    const { res, sendSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(sendEmailVerificationOTP).toHaveBeenCalledWith(
      'signup-no-id@example.com',
    );
    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({
        token: null,
        user: {
          email: 'signup-no-id@example.com',
          emailVerified: false,
          name: 'Demo',
        },
      }),
    );
  });

  it('should reject disposable sign-up emails before hitting Better Auth handler', async () => {
    const authHandler = vi.fn();
    const authService = {
      assertManagedAuthRateLimit: vi.fn().mockResolvedValue(undefined),
      assertEmailSignUpAllowed: vi
        .fn()
        .mockRejectedValue(
          new ManagedAuthFlowError(
            'This email is not supported.',
            'BAD_REQUEST',
            400,
          ),
        ),
      recoverUnverifiedSignUp: vi.fn(),
      consumePendingSignUpRecovery: vi.fn(),
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/sign-up/email');
    req.body = {
      email: 'blocked@mailinator.com',
      password: buildCredential('signup-disposable'),
      name: 'Blocked User',
    };
    const { res, statusSpy, jsonSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith({
      code: 'BAD_REQUEST',
      message: 'This email is not supported.',
    });
    expect(authHandler).not.toHaveBeenCalled();
  });

  it('should hide internal errors when managed forgot-password otp send fails unexpectedly', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const authService = {
      assertManagedAuthRateLimit: vi.fn().mockResolvedValue(undefined),
      sendForgotPasswordOTP: vi.fn().mockRejectedValue(new Error('smtp down')),
      getAuth: vi.fn(),
    } as unknown as AuthService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/forget-password/email-otp');
    req.body = { email: 'signup-no-id@example.com' };
    const { res, statusSpy, jsonSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith({
      code: 'SEND_FAILED',
      message: 'Failed to send reset code',
    });
    consoleErrorSpy.mockRestore();
  });

  it('should not consume the managed otp limiter when send-verification-otp falls through to Better Auth', async () => {
    const authHandler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    const assertManagedAuthRateLimit = vi.fn().mockResolvedValue(undefined);
    const authService = {
      assertManagedAuthRateLimit,
      sendEmailVerificationOTP: vi.fn(),
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/email-otp/send-verification-otp');
    req.body = { email: 'user@example.com', type: 'sign-in' };
    const { res, sendSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(assertManagedAuthRateLimit).not.toHaveBeenCalled();
    expect(authHandler).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ success: true }));
  });

  it('should apply auth-specific rate limiting to managed forgot-password otp routes', async () => {
    const authService = {
      assertManagedAuthRateLimit: vi
        .fn()
        .mockRejectedValue(
          new ManagedAuthFlowError(
            'Too many requests. Please try again later.',
            'TOO_MANY_REQUESTS',
            429,
          ),
        ),
      sendForgotPasswordOTP: vi.fn(),
      getAuth: vi.fn(),
    } as unknown as AuthService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/forget-password/email-otp');
    req.body = { email: 'rate-limit@example.com' };
    const { res, statusSpy, jsonSpy } = createRes();

    await controller.handleAuth(req, res);

    expect(statusSpy).toHaveBeenCalledWith(429);
    expect(jsonSpy).toHaveBeenCalledWith({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please try again later.',
    });
  });

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
      consumePendingSignUpRecovery: vi.fn(),
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

    const consumePendingSignUpRecovery = vi
      .fn()
      .mockResolvedValue({ name: 'Recovered Name' });
    const authService = {
      consumePendingSignUpRecovery,
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
        name: 'Recovered Name',
      },
    });
    expect(createAccessTokenSpy).toHaveBeenCalledWith('user_verify_1');
    expect(issueRefreshTokenSpy).toHaveBeenCalledWith('user_verify_1', {
      ipAddress: '127.0.0.1',
      userAgent: 'vitest-agent',
    });
    expect(consumePendingSignUpRecovery).toHaveBeenCalledWith({
      userId: 'user_verify_1',
      email: 'verify@example.com',
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
      consumePendingSignUpRecovery: vi.fn(),
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

  it('should keep /api/v1/auth path without remapping', async () => {
    const authHandler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    const authService = {
      consumePendingSignUpRecovery: vi.fn(),
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;

    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const req = createReq('/api/v1/auth/sign-in/social?provider=google');
    const { res } = createRes();

    await controller.handleAuth(req, res);

    const request = authHandler.mock.calls[0]?.[0] as Request | undefined;
    expect(request).toBeDefined();
    expect(request?.url).toContain(
      '/api/v1/auth/sign-in/social?provider=google',
    );
    expect(request?.url).not.toContain('/api/auth/sign-in/social');
  });
});
