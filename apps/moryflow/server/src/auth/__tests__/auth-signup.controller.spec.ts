import { describe, expect, it, vi } from 'vitest';
import type { Request as ExpressRequest } from 'express';
import { AuthSignupController } from '../auth-signup.controller';
import type { AuthSignupService } from '../auth-signup.service';
import type { AuthTokensService } from '../auth.tokens.service';
import { ManagedAuthFlowError } from '../auth.service';

const createReq = (): ExpressRequest =>
  ({
    ip: '127.0.0.1',
    get: vi.fn((name: string) => {
      if (name.toLowerCase() === 'user-agent') {
        return 'vitest-agent';
      }
      return undefined;
    }),
  }) as unknown as ExpressRequest;

describe('AuthSignupController', () => {
  it('should reject the legacy /sign-up/email endpoint', () => {
    const service = {
      startEmailSignUp: vi.fn(),
      verifyEmailSignUpOTP: vi.fn(),
      completeEmailSignUp: vi.fn(),
    } as unknown as AuthSignupService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthSignupController(service, tokensService);

    try {
      controller.rejectLegacyEmailSignUp();
      throw new Error('Expected legacy sign-up endpoint to throw');
    } catch (error) {
      expect(error).toMatchObject({
        status: 410,
        response: {
          code: 'LEGACY_SIGN_UP_DISABLED',
        },
      });
    }
  });

  it('should start email sign-up and return success', async () => {
    const startEmailSignUp = vi.fn().mockResolvedValue(undefined);
    const service = {
      startEmailSignUp,
      verifyEmailSignUpOTP: vi.fn(),
      completeEmailSignUp: vi.fn(),
      assertManagedAuthRateLimit: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthSignupService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthSignupController(service, tokensService);

    const result = await controller.startEmailSignUp(createReq(), {
      email: 'demo@example.com',
    });

    expect(startEmailSignUp).toHaveBeenCalledWith('demo@example.com');
    expect(result).toEqual({ success: true });
  });

  it('should verify signup otp and return a completion token', async () => {
    const verifyEmailSignUpOTP = vi.fn().mockResolvedValue({
      signupToken: 'signup-token',
      signupTokenExpiresAt: '2030-01-01T00:10:00.000Z',
    });
    const service = {
      startEmailSignUp: vi.fn(),
      verifyEmailSignUpOTP,
      completeEmailSignUp: vi.fn(),
      assertManagedAuthRateLimit: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthSignupService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthSignupController(service, tokensService);

    const result = await controller.verifyEmailSignUpOTP(createReq(), {
      email: 'demo@example.com',
      otp: '123456',
    });

    expect(verifyEmailSignUpOTP).toHaveBeenCalledWith(
      'demo@example.com',
      '123456',
    );
    expect(result).toEqual({
      signupToken: 'signup-token',
      signupTokenExpiresAt: '2030-01-01T00:10:00.000Z',
    });
  });

  it('should complete sign-up and return token-first auth payload', async () => {
    const completeEmailSignUp = vi.fn().mockResolvedValue({
      user: {
        id: 'user_signup_1',
        email: 'demo@example.com',
        emailVerified: true,
        name: 'demo123',
      },
    });
    const createAccessToken = vi.fn().mockResolvedValue({
      token: 'access-token',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });
    const issueRefreshToken = vi.fn().mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date('2030-01-08T00:00:00.000Z'),
    });
    const service = {
      startEmailSignUp: vi.fn(),
      verifyEmailSignUpOTP: vi.fn(),
      completeEmailSignUp,
      assertManagedAuthRateLimit: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthSignupService;
    const tokensService = {
      createAccessToken,
      issueRefreshToken,
    } as unknown as AuthTokensService;

    const controller = new AuthSignupController(service, tokensService);

    const result = await controller.completeEmailSignUp(createReq(), {
      signupToken: 'signup-token',
      password: 'secret-123',
    });

    expect(completeEmailSignUp).toHaveBeenCalledWith(
      'signup-token',
      'secret-123',
    );
    expect(createAccessToken).toHaveBeenCalledWith('user_signup_1');
    expect(issueRefreshToken).toHaveBeenCalledWith('user_signup_1', {
      ipAddress: '127.0.0.1',
      userAgent: 'vitest-agent',
    });
    expect(result).toEqual({
      status: true,
      accessToken: 'access-token',
      accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: '2030-01-08T00:00:00.000Z',
      user: {
        id: 'user_signup_1',
        email: 'demo@example.com',
        emailVerified: true,
        name: 'demo123',
      },
    });
  });

  it('should convert managed signup service errors into http exceptions for start', async () => {
    const service = {
      startEmailSignUp: vi
        .fn()
        .mockRejectedValue(
          new ManagedAuthFlowError(
            'Account already exists',
            'ACCOUNT_ALREADY_EXISTS',
            409,
          ),
        ),
      verifyEmailSignUpOTP: vi.fn(),
      completeEmailSignUp: vi.fn(),
      assertManagedAuthRateLimit: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthSignupService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthSignupController(service, tokensService);

    await expect(
      controller.startEmailSignUp(createReq(), {
        email: 'demo@example.com',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'Account already exists',
      },
      status: 409,
    });
  });

  it('should convert managed signup service errors into http exceptions for verify', async () => {
    const service = {
      startEmailSignUp: vi.fn(),
      verifyEmailSignUpOTP: vi
        .fn()
        .mockRejectedValue(
          new ManagedAuthFlowError('Invalid OTP', 'INVALID_OTP', 400),
        ),
      completeEmailSignUp: vi.fn(),
      assertManagedAuthRateLimit: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthSignupService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthSignupController(service, tokensService);

    await expect(
      controller.verifyEmailSignUpOTP(createReq(), {
        email: 'demo@example.com',
        otp: '123456',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'INVALID_OTP',
        message: 'Invalid OTP',
      },
      status: 400,
    });
  });

  it('should convert managed signup service errors into http exceptions for complete', async () => {
    const service = {
      startEmailSignUp: vi.fn(),
      verifyEmailSignUpOTP: vi.fn(),
      completeEmailSignUp: vi
        .fn()
        .mockRejectedValue(
          new ManagedAuthFlowError(
            'Invalid signup token',
            'INVALID_SIGNUP_TOKEN',
            400,
          ),
        ),
      assertManagedAuthRateLimit: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthSignupService;
    const tokensService = {
      createAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
    } as unknown as AuthTokensService;

    const controller = new AuthSignupController(service, tokensService);

    await expect(
      controller.completeEmailSignUp(createReq(), {
        signupToken: 'signup-token',
        password: 'secret-123',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'INVALID_SIGNUP_TOKEN',
        message: 'Invalid signup token',
      },
      status: 400,
    });
  });
});
