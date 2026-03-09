/**
 * [INPUT]: Express Request/Response
 * [OUTPUT]: Better Auth handler 透传响应或 Token-first 统一登录响应
 * [POS]: /api/v1/auth/* 路由入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService, ManagedAuthFlowError } from './auth.service';
import { AuthTokensService } from './auth.tokens.service';
import { Public } from './decorators';
import { applyAuthResponse, buildAuthRequest } from './auth.handler.utils';

type BetterAuthUserPayload = {
  id: string;
  email?: string;
  emailVerified?: boolean;
  name?: string | null;
};

type SignUpRecoveryResponse = {
  token: null;
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
};

const TOKEN_FIRST_PATHS = new Set([
  '/api/v1/auth/sign-in/email',
  '/api/v1/auth/email-otp/verify-email',
]);

/**
 * Better Auth 路由控制器
 * 处理 /api/v1/auth/* 的所有请求
 */
@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokensService: AuthTokensService,
  ) {}

  @ApiExcludeEndpoint()
  @Public()
  @All('*path')
  async handleAuth(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    if (await this.maybeRejectInvalidEmailSignUp(req, res)) {
      return;
    }

    if (await this.maybeHandleManagedOTPRequest(req, res)) {
      return;
    }

    const recoveredSignUp = await this.maybeRecoverUnverifiedSignUp(req);
    if (recoveredSignUp) {
      const rateLimited = await this.applyManagedAuthRateLimit(
        req,
        '/api/v1/auth/sign-up/email',
      );
      if (rateLimited) {
        res
          .status(rateLimited.status)
          .json({ code: rateLimited.code, message: rateLimited.message });
        return;
      }

      const failed = await this.sendManagedOtpOrRespond(
        res,
        () =>
          this.authService.sendEmailVerificationOTP(recoveredSignUp.user.email),
        'Failed to send verification code',
      );
      if (failed) {
        return;
      }
      res.status(200).json(recoveredSignUp);
      return;
    }

    const auth = this.authService.getAuth();
    const response = await auth.handler(
      buildAuthRequest(req, {
        path: req.originalUrl,
      }),
    );
    if (await this.maybeHandlePostSignUpOTP(req, res, response)) {
      return;
    }
    const tokenizedResponse = await this.buildTokenizedAuthResponse(
      req,
      response,
    );
    if (tokenizedResponse) {
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      res.status(200).json(tokenizedResponse);
      return;
    }

    await applyAuthResponse(res, response);
  }

  private async maybeHandleManagedOTPRequest(
    req: ExpressRequest,
    res: ExpressResponse,
  ): Promise<boolean> {
    if (req.method !== 'POST') {
      return false;
    }

    const pathname = this.normalizePathname(req.originalUrl);
    if (pathname === '/api/v1/auth/email-otp/send-verification-otp') {
      const type = this.readBodyString(req, 'type') ?? '';
      if (type !== 'email-verification') {
        return false;
      }

      const rateLimited = await this.applyManagedAuthRateLimit(req, pathname);
      if (rateLimited) {
        res
          .status(rateLimited.status)
          .json({ code: rateLimited.code, message: rateLimited.message });
        return true;
      }

      const email = this.readBodyString(req, 'email') ?? '';
      const failed = await this.sendManagedOtpOrRespond(
        res,
        () => this.authService.sendEmailVerificationOTP(email),
        'Failed to send verification code',
      );
      if (!failed) res.status(200).json({ success: true });
      return true;
    }

    if (pathname === '/api/v1/auth/forget-password/email-otp') {
      const rateLimited = await this.applyManagedAuthRateLimit(req, pathname);
      if (rateLimited) {
        res
          .status(rateLimited.status)
          .json({ code: rateLimited.code, message: rateLimited.message });
        return true;
      }

      const email = this.readBodyString(req, 'email') ?? '';
      const failed = await this.sendManagedOtpOrRespond(
        res,
        () => this.authService.sendForgotPasswordOTP(email),
        'Failed to send reset code',
      );
      if (!failed) res.status(200).json({ success: true });
      return true;
    }

    return false;
  }

  private async maybeHandlePostSignUpOTP(
    req: ExpressRequest,
    res: ExpressResponse,
    response: Response,
  ): Promise<boolean> {
    if (!this.isEmailSignUpRequest(req) || !response.ok) {
      return false;
    }

    const payload = await this.safeParseJson(response);
    const email =
      this.getEmailFromPayload(payload) ?? this.readBodyString(req, 'email');
    if (!email) {
      return false;
    }

    return this.sendManagedOtpOrRespond(
      res,
      () => this.authService.sendEmailVerificationOTP(email),
      'Failed to send verification code',
    );
  }

  private async buildTokenizedAuthResponse(
    req: ExpressRequest,
    response: Response,
  ): Promise<{
    status: true;
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    user: BetterAuthUserPayload;
  } | null> {
    if (!this.shouldIssueBusinessTokens(req, response)) {
      return null;
    }

    const payload = await this.safeParseJson(response);
    const user = this.getUserFromPayload(payload);
    if (!user?.id) {
      return null;
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.tokensService.createAccessToken(user.id),
      this.tokensService.issueRefreshToken(user.id, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      }),
    ]);

    return {
      status: true,
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt.toISOString(),
      user,
    };
  }

  private async maybeRecoverUnverifiedSignUp(
    req: ExpressRequest,
  ): Promise<SignUpRecoveryResponse | null> {
    if (!this.isEmailSignUpRequest(req)) {
      return null;
    }

    const email = this.readBodyString(req, 'email') ?? '';
    if (!email.trim()) {
      return null;
    }

    return this.authService.recoverUnverifiedSignUp({ email });
  }

  private shouldIssueBusinessTokens(
    req: ExpressRequest,
    response: Response,
  ): boolean {
    if (!response.ok) {
      return false;
    }

    return TOKEN_FIRST_PATHS.has(this.normalizePathname(req.originalUrl));
  }

  private normalizePathname(originalUrl: string): string {
    try {
      const parsed = new URL(originalUrl, 'http://localhost');
      return parsed.pathname.replace(/\/+$/, '');
    } catch {
      return originalUrl.split('?')[0]?.replace(/\/+$/, '') ?? originalUrl;
    }
  }

  private isEmailSignUpRequest(req: ExpressRequest): boolean {
    return (
      req.method === 'POST' &&
      this.normalizePathname(req.originalUrl) === '/api/v1/auth/sign-up/email'
    );
  }

  private async maybeRejectInvalidEmailSignUp(
    req: ExpressRequest,
    res: ExpressResponse,
  ): Promise<boolean> {
    if (!this.isEmailSignUpRequest(req)) {
      return false;
    }

    const email = this.readBodyString(req, 'email') ?? '';
    if (!email.trim()) {
      return false;
    }

    try {
      this.authService.assertEmailSignUpAllowed(email);
      return false;
    } catch (error) {
      const managedError = this.toManagedAuthFlowError(
        error,
        'Failed to send verification code',
      );
      if (managedError.code === 'BAD_REQUEST') {
        const rateLimited = await this.applyManagedAuthRateLimit(
          req,
          '/api/v1/auth/sign-up/email',
        );
        if (rateLimited) {
          res
            .status(rateLimited.status)
            .json({ code: rateLimited.code, message: rateLimited.message });
          return true;
        }
        res
          .status(managedError.status)
          .json({ code: managedError.code, message: managedError.message });
        return true;
      }
      throw managedError;
    }
  }

  private async applyManagedAuthRateLimit(
    req: ExpressRequest,
    pathname: string,
  ): Promise<ManagedAuthFlowError | null> {
    try {
      await this.authService.assertManagedAuthRateLimit(
        pathname,
        req.ip ?? 'unknown',
      );
      return null;
    } catch (error) {
      return this.toManagedAuthFlowError(
        error,
        'Too many requests. Please try again later.',
      );
    }
  }

  private async sendManagedOtpOrRespond(
    res: ExpressResponse,
    send: () => Promise<void>,
    fallbackMessage: string,
  ): Promise<boolean> {
    try {
      await send();
      return false;
    } catch (error) {
      const managedError = this.toManagedAuthFlowError(error, fallbackMessage);
      res
        .status(managedError.status)
        .json({ code: managedError.code, message: managedError.message });
      return true;
    }
  }

  private toManagedAuthFlowError(
    error: unknown,
    fallbackMessage: string,
  ): ManagedAuthFlowError {
    if (error instanceof ManagedAuthFlowError) {
      return error;
    }

    if (error instanceof Error) {
      console.error('[AuthController] managed auth flow failed:', error);
    }

    return new ManagedAuthFlowError(fallbackMessage, 'SEND_FAILED', 500);
  }

  private async safeParseJson(
    response: Response,
  ): Promise<Record<string, unknown> | null> {
    try {
      return (await response.clone().json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getUserFromPayload(
    payload: Record<string, unknown> | null,
  ): BetterAuthUserPayload | null {
    const rawUser = payload?.user;
    if (!rawUser || typeof rawUser !== 'object') {
      return null;
    }

    const user = rawUser as Record<string, unknown>;
    const id = typeof user.id === 'string' ? user.id : undefined;
    if (!id) {
      return null;
    }

    return {
      id,
      email: typeof user.email === 'string' ? user.email : undefined,
      emailVerified:
        typeof user.emailVerified === 'boolean'
          ? user.emailVerified
          : undefined,
      name:
        typeof user.name === 'string' || user.name === null
          ? user.name
          : undefined,
    };
  }

  private getEmailFromPayload(
    payload: Record<string, unknown> | null,
  ): string | undefined {
    const rawUser = payload?.user;
    if (!rawUser || typeof rawUser !== 'object') {
      return undefined;
    }

    const user = rawUser as Record<string, unknown>;
    return typeof user.email === 'string' ? user.email : undefined;
  }

  private readBodyString(req: ExpressRequest, key: string): string | undefined {
    const body = req.body as Record<string, unknown> | null | undefined;
    const value = body?.[key];
    return typeof value === 'string' ? value : undefined;
  }
}
