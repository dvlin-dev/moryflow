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
import {
  BROWSER_CONTEXT_HEADER_NAMES,
  isBetterAuthTokenFirstPath,
  shouldIgnoreBrowserContextForAuthRequest,
} from './auth-request-context';

type BetterAuthUserPayload = {
  id: string;
  email?: string;
  emailVerified?: boolean;
  name?: string | null;
};

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
    if (await this.maybeHandleManagedOTPRequest(req, res)) {
      return;
    }

    const auth = this.authService.getAuth();
    const authRequest = this.isOriginlessPost(req)
      ? buildAuthRequest(req, {
          path: req.originalUrl,
          includeRequestHeaders: false,
          headers: this.buildDeviceSafeHeaders(req),
        })
      : buildAuthRequest(req, {
          path: req.originalUrl,
          stripRequestHeaders: shouldIgnoreBrowserContextForAuthRequest(req)
            ? [...BROWSER_CONTEXT_HEADER_NAMES]
            : undefined,
        });
    const response = await auth.handler(authRequest);
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

  private shouldIssueBusinessTokens(
    req: ExpressRequest,
    response: Response,
  ): boolean {
    if (!response.ok) {
      return false;
    }

    return isBetterAuthTokenFirstPath(this.normalizePathname(req.originalUrl));
  }

  private normalizePathname(originalUrl: string): string {
    try {
      const parsed = new URL(originalUrl, 'http://localhost');
      return parsed.pathname.replace(/\/+$/, '');
    } catch {
      return originalUrl.split('?')[0]?.replace(/\/+$/, '') ?? originalUrl;
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

  private isOriginlessPost(req: ExpressRequest): boolean {
    return req.method === 'POST' && !req.headers.origin;
  }

  /**
   * 无 Origin 的 POST 只转发已知安全的头给 Better Auth（白名单）。
   * 合法浏览器 POST 必定携带 Origin；无 Origin 的 POST 来自设备端或反代后的
   * 服务端调用，不应携带 cookie / Sec-Fetch-* 等浏览器上下文头。
   * 反代（1panel/nginx）可能注入 cookie 或透传 Sec-Fetch-*，黑名单式 strip
   * 无法穷举；白名单方式从根本上杜绝干扰头进入 Better Auth CSRF 中间件。
   */
  private buildDeviceSafeHeaders(req: ExpressRequest): Headers {
    const headers = new Headers();
    const forwarded: readonly string[] = [
      'content-type',
      'accept',
      'user-agent',
      'accept-language',
      'x-app-platform',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-forwarded-host',
      'x-forwarded-port',
      'x-real-ip',
      'x-request-id',
    ];

    for (const name of forwarded) {
      const value = req.headers[name];
      if (typeof value === 'string' && value.trim()) {
        headers.set(name, value);
      } else if (Array.isArray(value)) {
        const joined = value.join(', ');
        if (joined.trim()) {
          headers.set(name, joined);
        }
      }
    }

    return headers;
  }

  private readBodyString(req: ExpressRequest, key: string): string | undefined {
    const body = req.body as Record<string, unknown> | null | undefined;
    const value = body?.[key];
    return typeof value === 'string' ? value : undefined;
  }
}
