import { describe, expect, it, vi } from 'vitest';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthController } from '../auth.controller';
import type { AuthService } from '../auth.service';
import type { AuthTokensService } from '../auth.tokens.service';

const createReq = (): ExpressRequest =>
  ({
    originalUrl: '/api/v1/auth/sign-up/email',
    protocol: 'https',
    method: 'POST',
    headers: {},
    body: {
      email: 'demo@moryflow.com',
    },
    ip: '127.0.0.1',
    get: vi.fn(() => undefined),
  }) as unknown as ExpressRequest;

const createRes = () => {
  const status = vi.fn();
  const json = vi.fn();
  const res = {
    status,
    json,
    setHeader: vi.fn(),
  } as unknown as ExpressResponse;
  status.mockReturnValue(res);
  return { res, status, json };
};

describe('AuthController sign-up recovery', () => {
  it('should return idempotent sign-up success for existing unverified email', async () => {
    const authHandler = vi.fn();
    const sendRecoveryVerificationOTP = vi.fn().mockResolvedValue(undefined);
    const authService = {
      assertManagedAuthRateLimit: vi.fn().mockResolvedValue(undefined),
      assertEmailSignUpAllowed: vi.fn().mockResolvedValue(undefined),
      recoverUnverifiedSignUp: vi.fn().mockResolvedValue({
        token: null,
        user: {
          id: 'user_1',
          email: 'demo@moryflow.com',
          name: 'Demo',
          image: null,
          emailVerified: false,
          createdAt: new Date('2026-03-08T00:00:00.000Z'),
          updatedAt: new Date('2026-03-08T00:00:00.000Z'),
        },
      }),
      sendRecoveryVerificationOTP,
      getAuth: vi.fn().mockReturnValue({ handler: authHandler }),
    } as unknown as AuthService;

    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthController(authService, tokensService);
    const { res, status, json } = createRes();

    await controller.handleAuth(createReq(), res);

    expect(sendRecoveryVerificationOTP).toHaveBeenCalledWith({
      email: 'demo@moryflow.com',
      password: undefined,
      name: undefined,
    });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      token: null,
      user: {
        id: 'user_1',
        email: 'demo@moryflow.com',
        name: 'Demo',
        image: null,
        emailVerified: false,
        createdAt: new Date('2026-03-08T00:00:00.000Z'),
        updatedAt: new Date('2026-03-08T00:00:00.000Z'),
      },
    });
    expect(authHandler).not.toHaveBeenCalled();
  });
});
