import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSocialController } from '../auth-social.controller';
import type { AuthService } from '../auth.service';
import type { AuthTokensService } from '../auth.tokens.service';
import type { AuthSocialService } from '../auth-social.service';

const createResponseMock = () => {
  const setHeaderMock = vi.fn();
  const redirectMock = vi.fn();

  return {
    res: {
      setHeader: setHeaderMock,
      redirect: redirectMock,
    } as unknown as Response,
    setHeaderMock,
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
  let authService: AuthService;
  let authSocialService: AuthSocialService;
  let authTokensService: AuthTokensService;
  let controller: AuthSocialController;
  let getSessionFromRequestMock: ReturnType<typeof vi.fn>;
  let issueGoogleExchangeCodeMock: ReturnType<typeof vi.fn>;
  let consumeGoogleExchangeCodeMock: ReturnType<typeof vi.fn>;
  let buildGoogleBridgeDeepLinkMock: ReturnType<typeof vi.fn>;
  let createAccessTokenMock: ReturnType<typeof vi.fn>;
  let issueRefreshTokenMock: ReturnType<typeof vi.fn>;
  let getUserSnapshotMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSessionFromRequestMock = vi.fn();
    issueGoogleExchangeCodeMock = vi.fn();
    consumeGoogleExchangeCodeMock = vi.fn();
    buildGoogleBridgeDeepLinkMock = vi.fn();
    createAccessTokenMock = vi.fn();
    issueRefreshTokenMock = vi.fn();
    getUserSnapshotMock = vi.fn();

    authService = {
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
