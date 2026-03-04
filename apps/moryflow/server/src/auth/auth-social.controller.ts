/**
 * [INPUT]: OAuth bridge callback/exchange 请求
 * [OUTPUT]: deep link 重定向或 Token-first 会话 payload
 * [POS]: Auth Social 协议入口（Google）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AUTH_API } from '@moryflow/api';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { AuthSocialService } from './auth-social.service';
import { AuthTokensService } from './auth.tokens.service';
import { AUTH_SOCIAL_CACHE_CONTROL } from './auth-social.constants';
import { Public } from './decorators';
import { authSocialExchangeSchema, type AuthSocialExchangeDto } from './dto';
import { getAuthBaseUrl } from './auth.config';
import {
  appendAuthSetCookies,
  applyAuthResponse,
  buildAuthRequest,
} from './auth.handler.utils';

type SocialSignInPayload = {
  url?: string;
  redirect?: boolean;
  message?: string;
  detail?: string;
};

const OAUTH_START_FORWARD_HEADER_ALLOWLIST = [
  'cookie',
  'user-agent',
  'accept-language',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-forwarded-port',
] as const;

@ApiTags('Auth')
@Controller({ path: 'auth/social', version: '1' })
export class AuthSocialController {
  constructor(
    private readonly authService: AuthService,
    private readonly authSocialService: AuthSocialService,
    private readonly authTokensService: AuthTokensService,
  ) {}

  @Public()
  @Get('google/start')
  @ApiOperation({
    summary: 'Start Google OAuth in system browser context',
  })
  async googleStart(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
    @Query('nonce') nonce: string,
  ): Promise<void> {
    const normalizedNonce = this.requireGoogleNonce(nonce);
    const authResponse = await this.requestGoogleStartResponse(
      req,
      normalizedNonce,
    );

    if (!authResponse.ok) {
      await applyAuthResponse(res, authResponse);
      return;
    }

    const payload = await this.safeParseSocialSignInPayload(authResponse);
    if (!payload?.url || typeof payload.url !== 'string') {
      throw new InternalServerErrorException('Invalid social sign in response');
    }

    appendAuthSetCookies(res, authResponse.headers);
    res.setHeader('Cache-Control', AUTH_SOCIAL_CACHE_CONTROL);
    res.redirect(payload.url);
  }

  @Public()
  @Get('google/start/check')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Validate Google OAuth start readiness',
  })
  async googleStartCheck(
    @Req() req: ExpressRequest,
    @Query('nonce') nonce: string,
  ): Promise<void> {
    const normalizedNonce = this.requireGoogleNonce(nonce);
    const authResponse = await this.requestGoogleStartResponse(
      req,
      normalizedNonce,
    );

    if (!authResponse.ok) {
      await this.throwGoogleStartCheckError(authResponse);
    }

    const payload = await this.safeParseSocialSignInPayload(authResponse);
    if (!payload?.url || typeof payload.url !== 'string') {
      throw new InternalServerErrorException('Invalid social sign in response');
    }
  }

  @Public()
  @Get('google/bridge-callback')
  @ApiOperation({ summary: 'OAuth bridge callback for Google sign-in' })
  async googleBridgeCallback(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
    @Query('nonce') nonce: string,
  ): Promise<void> {
    const normalizedNonce = nonce?.trim();
    if (!normalizedNonce) {
      throw new BadRequestException('Invalid oauth nonce');
    }

    const session = await this.authService.getSessionFromRequest(req);
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const code = await this.authSocialService.issueGoogleExchangeCode({
      userId: session.user.id,
      nonce: normalizedNonce,
    });
    const deepLink = this.authSocialService.buildGoogleBridgeDeepLink({
      code,
      nonce: normalizedNonce,
    });

    res.setHeader('Cache-Control', AUTH_SOCIAL_CACHE_CONTROL);
    res.redirect(deepLink);
  }

  @Public()
  @Post('google/exchange')
  @ApiOperation({
    summary: 'Exchange OAuth bridge code for token-first payload',
  })
  async exchangeGoogleCode(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
    @Body(new ZodValidationPipe(authSocialExchangeSchema))
    dto: AuthSocialExchangeDto,
  ): Promise<{
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }> {
    const ticket = await this.authSocialService.consumeGoogleExchangeCode(
      dto.code.trim(),
    );
    if (!ticket) {
      throw new UnauthorizedException('Invalid or expired exchange code');
    }

    if (ticket.nonce !== dto.nonce.trim()) {
      throw new BadRequestException('Invalid oauth nonce');
    }

    const user = await this.authTokensService.getUserSnapshot(ticket.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.authTokensService.createAccessToken(ticket.userId),
      this.authTokensService.issueRefreshToken(ticket.userId, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      }),
    ]);

    res.setHeader('Cache-Control', AUTH_SOCIAL_CACHE_CONTROL);

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  private buildGoogleBridgeCallbackUrl(nonce: string): string {
    const baseUrl = getAuthBaseUrl();
    const url = new URL(AUTH_API.SOCIAL_GOOGLE_BRIDGE_CALLBACK, baseUrl);
    url.searchParams.set('nonce', nonce);
    return url.toString();
  }

  private requireGoogleNonce(nonce: string): string {
    const normalizedNonce = nonce?.trim();
    if (!normalizedNonce) {
      throw new BadRequestException('Invalid oauth nonce');
    }
    return normalizedNonce;
  }

  private requestGoogleStartResponse(
    req: ExpressRequest,
    nonce: string,
  ): Promise<globalThis.Response> {
    const callbackURL = this.buildGoogleBridgeCallbackUrl(nonce);
    return this.authService.getAuth().handler(
      buildAuthRequest(req, {
        path: AUTH_API.SIGN_IN_SOCIAL,
        method: 'POST',
        includeRequestHeaders: false,
        headers: this.buildGoogleStartForwardHeaders(req),
        body: JSON.stringify({
          provider: 'google',
          disableRedirect: true,
          callbackURL,
        }),
      }),
    );
  }

  private buildGoogleStartForwardHeaders(req: ExpressRequest): Headers {
    const headers = new Headers({
      'content-type': 'application/json',
    });

    for (const name of OAUTH_START_FORWARD_HEADER_ALLOWLIST) {
      const value = this.readRequestHeader(req, name);
      if (!value) {
        continue;
      }
      headers.set(name, value);
    }

    return headers;
  }

  private readRequestHeader(req: ExpressRequest, name: string): string | null {
    const raw = req.headers[name];
    if (typeof raw === 'string') {
      const normalized = raw.trim();
      return normalized || null;
    }

    if (Array.isArray(raw)) {
      const normalized = raw.map((item) => item.trim()).filter(Boolean);
      return normalized.length > 0 ? normalized.join(', ') : null;
    }

    return null;
  }

  private async safeParseSocialSignInPayload(
    response: globalThis.Response,
  ): Promise<SocialSignInPayload | null> {
    try {
      return (await response.clone().json()) as SocialSignInPayload;
    } catch {
      return null;
    }
  }

  private async throwGoogleStartCheckError(
    response: globalThis.Response,
  ): Promise<never> {
    const payload = await this.safeParseSocialSignInPayload(response);
    const message =
      payload?.detail || payload?.message || 'Google sign in is unavailable';
    if (response.status >= 500) {
      throw new InternalServerErrorException(message);
    }
    throw new BadRequestException(message);
  }
}
