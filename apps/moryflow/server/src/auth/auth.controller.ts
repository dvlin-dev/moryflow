/**
 * [INPUT]: Express Request/Response
 * [OUTPUT]: Better Auth handler 透传响应或 Token-first 统一登录响应
 * [POS]: /api/v1/auth/* 路由入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from './auth.service';
import { AuthTokensService } from './auth.tokens.service';
import { Public } from './decorators';
import { applyAuthResponse, buildAuthRequest } from './auth.handler.utils';

type BetterAuthUserPayload = {
  id?: string;
  email?: string;
  emailVerified?: boolean;
  name?: string | null;
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
    const auth = this.authService.getAuth();
    const response = await auth.handler(
      buildAuthRequest(req, {
        path: this.mapToBetterAuthPath(req.originalUrl),
      }),
    );
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

  private mapToBetterAuthPath(originalUrl: string): string {
    try {
      const parsed = new URL(originalUrl, 'http://localhost');
      parsed.pathname = parsed.pathname.replace(
        /^\/api\/v1\/auth(?=\/|$)/,
        '/api/auth',
      );
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      const [path, search = ''] = originalUrl.split('?');
      const mappedPath = (path ?? '').replace(
        /^\/api\/v1\/auth(?=\/|$)/,
        '/api/auth',
      );
      return search ? `${mappedPath}?${search}` : mappedPath;
    }
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
}
