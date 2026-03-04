import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSocialController } from '../auth-social.controller';
import type { AuthService } from '../auth.service';
import type { AuthTokensService } from '../auth.tokens.service';
import type { AuthSocialService } from '../auth-social.service';

const createResponseMock = () => {
  const headerStore: Record<string, unknown> = {};
  const setHeaderMock = vi.fn();
  const getHeaderMock = vi.fn(
    (name: string) => headerStore[name.toLowerCase()],
  );
  const redirectMock = vi.fn();

  return {
    res: {
      setHeader: ((name: string, value: unknown) => {
        headerStore[name.toLowerCase()] = value;
        setHeaderMock(name, value);
      }) as Response['setHeader'],
      getHeader: getHeaderMock as Response['getHeader'],
      redirect: redirectMock,
    } as unknown as Response,
    setHeaderMock,
    getHeaderMock,
    redirectMock,
  };
};

const createRequestMock = (userAgent = 'vitest-agent') =>
  ({
    ip: '127.0.0.1',
    get: vi.fn((name: string) =>
      name.toLowerCase() === 'user-agent' ? userAgent : undefined,
    ),
  }) as unknown as Request;

describe('AuthSocialController', () => {
  const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
  let authService: AuthService;
  let authSocialService: AuthSocialService;
  let authTokensService: AuthTokensService;
  let controller: AuthSocialController;
  let getAuthMock: ReturnType<typeof vi.fn>;
  let authHandlerMock: ReturnType<typeof vi.fn>;
  let getSessionFromRequestMock: ReturnType<typeof vi.fn>;
  let issueGoogleExchangeCodeMock: ReturnType<typeof vi.fn>;
  let consumeGoogleExchangeCodeMock: ReturnType<typeof vi.fn>;
  let buildGoogleBridgeDeepLinkMock: ReturnType<typeof vi.fn>;
  let createAccessTokenMock: ReturnType<typeof vi.fn>;
  let issueRefreshTokenMock: ReturnType<typeof vi.fn>;
  let getUserSnapshotMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.BETTER_AUTH_URL = 'https://server.moryflow.com';

    getAuthMock = vi.fn();
    authHandlerMock = vi.fn();
    getSessionFromRequestMock = vi.fn();
    issueGoogleExchangeCodeMock = vi.fn();
    consumeGoogleExchangeCodeMock = vi.fn();
    buildGoogleBridgeDeepLinkMock = vi.fn();
    createAccessTokenMock = vi.fn();
    issueRefreshTokenMock = vi.fn();
    getUserSnapshotMock = vi.fn();

    getAuthMock.mockReturnValue({
      handler: authHandlerMock,
    });

    authService = {
      getAuth: getAuthMock,
      getSessionFromRequest: getSessionFromRequestMock,
    } as unknown as AuthService;
    authSocialService = {
      issueGoogleExchangeCode: issueGoogleExchangeCodeMock,
      consumeGoogleExchangeCode: consumeGoogleExchangeCodeMock,
      buildGoogleBridgeDeepLink: buildGoogleBridgeDeepLinkMock,
    } as unknown as AuthSocialService;
    authTokensService = {
      createAccessToken: createAccessTokenMock,
      issueRefreshToken: issueRefreshTokenMock,
      getUserSnapshot: getUserSnapshotMock,
    } as unknown as AuthTokensService;

    controller = new AuthSocialController(
      authService,
      authSocialService,
      authTokensService,
    );
  });

  afterEach(() => {
    process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
  });

  it('should redirect to deep link when bridge callback is successful', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      session: { id: 's_1', expiresAt: new Date('2030-01-01T00:00:00.000Z') },
      user: {
        id: 'user_1',
        email: 'user@example.com',
        name: 'Demo',
        subscriptionTier: 'free',
        isAdmin: false,
      },
    });
    issueGoogleExchangeCodeMock.mockResolvedValueOnce('code_1');
    buildGoogleBridgeDeepLinkMock.mockReturnValueOnce(
      'moryflow://auth/success?code=code_1&nonce=nonce_1',
    );

    const req = createRequestMock();
    const { res, setHeaderMock, redirectMock } = createResponseMock();

    await controller.googleBridgeCallback(req, res, 'nonce_1');

    expect(setHeaderMock).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store, must-revalidate',
    );
    expect(redirectMock).toHaveBeenCalledWith(
      'moryflow://auth/success?code=code_1&nonce=nonce_1',
    );
  });

  it('should reject bridge callback without auth session', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce(null);
    const req = createRequestMock();
    const { res } = createResponseMock();

    await expect(
      controller.googleBridgeCallback(req, res, 'nonce_1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should redirect to provider url and forward auth cookies on start', async () => {
    authHandlerMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          url: 'https://accounts.google.com/o/oauth2/v2/auth?state=state_1',
          redirect: false,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'better-auth.state=state_1; Path=/; HttpOnly',
          },
        },
      ),
    );
    const req = {
      ...createRequestMock(),
      protocol: 'https',
      get: vi.fn((name: string) => {
        if (name.toLowerCase() === 'host') {
          return 'evil.example.com';
        }
        if (name.toLowerCase() === 'user-agent') {
          return 'vitest-agent';
        }
        return undefined;
      }),
      headers: {
        cookie: 'ba_session=abc123',
        'accept-language': 'zh-CN',
        'x-forwarded-for': '1.2.3.4',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'evil.example.com',
        'content-length': '0',
        connection: 'keep-alive',
        'transfer-encoding': 'chunked',
      },
      method: 'GET',
      originalUrl: '/api/v1/auth/social/google/start?nonce=nonce_start',
      rawBody: undefined,
      body: undefined,
    } as unknown as Request;
    const { res, setHeaderMock, redirectMock } = createResponseMock();

    await controller.googleStart(req, res, 'nonce_start');

    expect(authHandlerMock).toHaveBeenCalledTimes(1);
    const authRequest = authHandlerMock.mock
      .calls[0]?.[0] as globalThis.Request;
    expect(authRequest.url).toBe(
      'https://evil.example.com/api/v1/auth/sign-in/social',
    );
    const socialBody = JSON.parse(await authRequest.text()) as {
      provider: string;
      disableRedirect: boolean;
      callbackURL: string;
    };
    expect(socialBody).toMatchObject({
      provider: 'google',
      disableRedirect: true,
      callbackURL:
        'https://server.moryflow.com/api/v1/auth/social/google/bridge-callback?nonce=nonce_start',
    });
    expect(authRequest.headers.get('cookie')).toBe('ba_session=abc123');
    expect(authRequest.headers.get('accept-language')).toBe('zh-CN');
    expect(authRequest.headers.get('x-forwarded-for')).toBe('1.2.3.4');
    expect(authRequest.headers.get('x-forwarded-proto')).toBe('https');
    expect(authRequest.headers.get('x-forwarded-host')).toBe(
      'evil.example.com',
    );
    expect(authRequest.headers.get('content-length')).toBeNull();
    expect(authRequest.headers.get('transfer-encoding')).toBeNull();
    expect(authRequest.headers.get('connection')).toBeNull();

    expect(setHeaderMock).toHaveBeenCalledWith('set-cookie', [
      'better-auth.state=state_1; Path=/; HttpOnly',
    ]);
    expect(redirectMock).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth?state=state_1',
    );
  });

  it('should return token-first payload after exchange', async () => {
    consumeGoogleExchangeCodeMock.mockResolvedValueOnce({
      userId: 'user_2',
      nonce: 'nonce_2',
      provider: 'google',
      issuedAt: new Date('2030-01-01T00:00:00.000Z').toISOString(),
    });
    createAccessTokenMock.mockResolvedValueOnce({
      token: 'access_2',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });
    issueRefreshTokenMock.mockResolvedValueOnce({
      token: 'refresh_2',
      expiresAt: new Date('2030-02-01T00:00:00.000Z'),
    });
    getUserSnapshotMock.mockResolvedValueOnce({
      id: 'user_2',
      email: 'user2@example.com',
      name: 'User 2',
      subscriptionTier: 'free',
      isAdmin: false,
    });

    const req = createRequestMock();
    const { res, setHeaderMock } = createResponseMock();

    const output = await controller.exchangeGoogleCode(req, res, {
      code: 'code_2',
      nonce: 'nonce_2',
    });

    expect(setHeaderMock).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store, must-revalidate',
    );
    expect(output).toMatchObject({
      accessToken: 'access_2',
      refreshToken: 'refresh_2',
      user: {
        id: 'user_2',
      },
    });
  });

  it('should reject exchange when nonce mismatches', async () => {
    consumeGoogleExchangeCodeMock.mockResolvedValueOnce({
      userId: 'user_3',
      nonce: 'nonce_server',
      provider: 'google',
      issuedAt: new Date('2030-01-01T00:00:00.000Z').toISOString(),
    });

    const req = createRequestMock();
    const { res } = createResponseMock();

    await expect(
      controller.exchangeGoogleCode(req, res, {
        code: 'code_3',
        nonce: 'nonce_client',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
