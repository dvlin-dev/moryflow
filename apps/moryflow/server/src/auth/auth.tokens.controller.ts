/**
 * [INPUT]: refresh/logout/sign-out 请求（Header/Cookie/Body）
 * [OUTPUT]: accessToken 刷新结果或登出响应
 * [POS]: Auth Token 入口（/api/auth/*，含 Origin/Device 分流）
 */

import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Public } from './decorators';
import { AuthTokensService } from './auth.tokens.service';
import { AuthService } from './auth.service';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_TTL_SECONDS,
  isProduction,
} from './auth.constants';
import { getTrustedOrigins } from './auth.config';
import { isOriginAllowed } from '../common/utils';
import {
  parseCookieHeader,
  getRequestOrigin,
  getDevicePlatform,
} from './auth.tokens.utils';
import {
  refreshTokenSchema,
  logoutSchema,
  type RefreshTokenDto,
  type LogoutDto,
} from './dto';
import { applyAuthResponse, buildAuthRequest } from './auth.handler.utils';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthTokensController {
  constructor(
    private readonly tokensService: AuthTokensService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ) {
    const cookieToken = this.getRefreshTokenFromCookie(req);
    const bodyToken = dto.refreshToken?.trim();
    const devicePlatform = getDevicePlatform(req);
    const isDeviceRequest = this.assertTokenRequest(
      req,
      devicePlatform,
      bodyToken,
    );

    const tokenMeta = {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    };

    const refreshToken = bodyToken || cookieToken;
    const refreshTokenProvided = Boolean(refreshToken);
    const refreshResult = refreshTokenProvided
      ? await this.tokensService.rotateRefreshToken(refreshToken!, tokenMeta)
      : null;

    if (refreshTokenProvided && !refreshResult) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const sessionResult =
      refreshResult ?? (await this.issueRefreshFromSession(req, tokenMeta));

    if (!sessionResult) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = await this.tokensService.createAccessToken(
      sessionResult.user.id,
    );

    if (!isDeviceRequest) {
      this.setRefreshCookie(res, sessionResult.refreshToken);
    }

    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
      refreshToken: isDeviceRequest
        ? sessionResult.refreshToken.token
        : undefined,
      refreshTokenExpiresAt: sessionResult.refreshToken.expiresAt.toISOString(),
    };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodValidationPipe(logoutSchema)) dto: LogoutDto,
  ) {
    const cookieToken = this.getRefreshTokenFromCookie(req);
    const bodyToken = dto.refreshToken?.trim();
    const devicePlatform = getDevicePlatform(req);
    this.assertTokenRequest(req, devicePlatform, bodyToken);

    const token = bodyToken || cookieToken;
    if (token) {
      await this.tokensService.revokeRefreshToken(token);
    }

    this.clearRefreshCookie(res);
    await this.clearBetterAuthCookies(res);
    await this.revokeBetterAuthSession(req);
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    return { message: 'Logout successful' };
  }

  @Public()
  @Post('sign-out')
  @ApiOperation({ summary: 'Sign out and revoke refresh token' })
  async signOut(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new ZodValidationPipe(logoutSchema)) dto: LogoutDto,
  ): Promise<void> {
    const cookieToken = this.getRefreshTokenFromCookie(req);
    const bodyToken = dto.refreshToken?.trim();
    const devicePlatform = getDevicePlatform(req);
    this.assertTokenRequest(req, devicePlatform, bodyToken);
    const token = bodyToken || cookieToken;

    if (token) {
      await this.tokensService.revokeRefreshToken(token);
    }

    this.clearRefreshCookie(res);
    await this.clearBetterAuthCookies(res);

    const response = await this.authService
      .getAuth()
      .handler(buildAuthRequest(req));
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    await applyAuthResponse(res, response);
  }

  private getRefreshTokenFromCookie(req: Request): string | null {
    const cookies = parseCookieHeader(req.headers.cookie);
    const token = cookies[REFRESH_TOKEN_COOKIE_NAME];
    return token ? token.trim() : null;
  }

  private assertTokenRequest(
    req: Request,
    devicePlatform: string | null,
    bodyToken?: string | null,
  ): boolean {
    const isDeviceRequest = Boolean(devicePlatform) || Boolean(bodyToken);
    if (bodyToken && !devicePlatform) {
      throw new ForbiddenException('Missing or invalid X-App-Platform');
    }
    if (devicePlatform) {
      return true;
    }
    this.assertTrustedOrigin(req);
    return isDeviceRequest;
  }

  private assertTrustedOrigin(req: Request) {
    const origin = getRequestOrigin(req);
    if (!origin) {
      throw new ForbiddenException('Missing origin');
    }
    const trustedOrigins = getTrustedOrigins();
    if (trustedOrigins.length === 0) {
      return;
    }
    if (!isOriginAllowed(origin, trustedOrigins)) {
      throw new ForbiddenException('Invalid origin');
    }
  }

  private setRefreshCookie(
    res: Response,
    refreshToken: { token: string; expiresAt: Date },
  ) {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
      domain: isProduction ? '.moryflow.com' : undefined,
      expires: refreshToken.expiresAt,
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
      domain: isProduction ? '.moryflow.com' : undefined,
    });
  }

  private async clearBetterAuthCookies(res: Response) {
    const authContext = await this.authService.getAuth().$context;
    const cookies = authContext.authCookies;
    const cookieEntries = [
      cookies.sessionToken,
      cookies.sessionData,
      cookies.accountData,
      cookies.dontRememberToken,
    ];

    for (const cookie of cookieEntries) {
      const sameSite = cookie.options.sameSite;
      const normalizedSameSite =
        typeof sameSite === 'string'
          ? (sameSite.toLowerCase() as CookieOptions['sameSite'])
          : sameSite;
      const expressOptions: CookieOptions = {
        path: cookie.options.path,
        domain: cookie.options.domain,
        httpOnly: cookie.options.httpOnly,
        secure: cookie.options.secure,
        sameSite: normalizedSameSite,
        expires: cookie.options.expires,
        maxAge: cookie.options.maxAge,
      };
      res.clearCookie(cookie.name, expressOptions);
    }
  }

  private async issueRefreshFromSession(
    req: Request,
    tokenMeta: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const session = await this.authService.getSessionFromRequest(req);
    if (!session) {
      return null;
    }

    return {
      user: session.user,
      refreshToken: await this.tokensService.issueRefreshToken(
        session.user.id,
        tokenMeta,
      ),
    };
  }

  private async revokeBetterAuthSession(req: Request): Promise<void> {
    try {
      const response = await this.authService.getAuth().handler(
        buildAuthRequest(req, {
          path: '/api/auth/sign-out',
          method: 'POST',
          body: null,
        }),
      );
      void response.body?.cancel?.();
    } catch {
      // 登出应当保持幂等，忽略 sign-out 失败
    }
  }
}
