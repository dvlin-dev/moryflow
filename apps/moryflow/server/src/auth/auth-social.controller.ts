/**
 * [INPUT]: OAuth bridge callback/exchange 请求
 * [OUTPUT]: deep link 重定向或 Token-first 会话 payload
 * [POS]: Auth Social 协议入口（Google）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
  ServiceUnavailableException,
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
import {
  AUTH_SOCIAL_CACHE_CONTROL,
  normalizeDevLoopbackRedirectUri,
} from './auth-social.constants';
import { Public } from './decorators';
import { authSocialExchangeSchema, type AuthSocialExchangeDto } from './dto';
import { getAuthBaseUrl } from './auth.config';
import {
  appendAuthSetCookies,
  applyAuthResponse,
  buildAuthRequest,
} from './auth.handler.utils';
import { isGoogleProviderConfigured } from './auth-google-provider';

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
    @Query('redirectUri') redirectUri?: string,
  ): Promise<void> {
    const normalizedNonce = this.requireGoogleNonce(nonce);
    const authResponse = await this.requestGoogleStartResponse(
      req,
      normalizedNonce,
      redirectUri,
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
  googleStartCheck(
    @Query('nonce') nonce: string,
    @Query('redirectUri') redirectUri?: string,
  ): void {
    const normalizedNonce = this.requireGoogleNonce(nonce);
    if (!isGoogleProviderConfigured()) {
      throw new ServiceUnavailableException(
        'Google provider is not configured',
      );
    }
    this.buildGoogleBridgeCallbackUrl(normalizedNonce, redirectUri);
  }

  @Public()
  @Get('google/bridge-callback')
  @ApiOperation({ summary: 'OAuth bridge callback for Google sign-in' })
  async googleBridgeCallback(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
    @Query('nonce') nonce: string,
    @Query('redirectUri') redirectUri?: string,
  ): Promise<void> {
    const normalizedNonce = nonce?.trim();
    if (!normalizedNonce) {
      throw new BadRequestException('Invalid oauth nonce');
    }
    const loopbackRedirectUri = this.normalizeLoopbackRedirectUri(redirectUri);

    const session = await this.authService.getSessionFromRequest(req);
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const code = await this.authSocialService.issueGoogleExchangeCode({
      userId: session.user.id,
      nonce: normalizedNonce,
    });
    const deepLink = this.resolveGoogleBridgeRedirectTarget({
      code,
      nonce: normalizedNonce,
      redirectUri: loopbackRedirectUri,
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

  private buildGoogleBridgeCallbackUrl(
    nonce: string,
    redirectUri?: string,
  ): string {
    const baseUrl = getAuthBaseUrl();
    const url = new URL(AUTH_API.SOCIAL_GOOGLE_BRIDGE_CALLBACK, baseUrl);
    url.searchParams.set('nonce', nonce);
    const loopbackRedirectUri = this.normalizeLoopbackRedirectUri(redirectUri);
    if (loopbackRedirectUri) {
      url.searchParams.set('redirectUri', loopbackRedirectUri);
    }
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
    redirectUri?: string,
  ): Promise<globalThis.Response> {
    const callbackURL = this.buildGoogleBridgeCallbackUrl(nonce, redirectUri);
    const authRequestUrl = new URL(
      AUTH_API.SIGN_IN_SOCIAL,
      getAuthBaseUrl(),
    ).toString();
    return this.authService.getAuth().handler(
      buildAuthRequest(req, {
        path: authRequestUrl,
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
      origin: new URL(getAuthBaseUrl()).origin,
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

  private resolveGoogleBridgeRedirectTarget(input: {
    code: string;
    nonce: string;
    redirectUri: string | null;
  }): string {
    if (!input.redirectUri) {
      return this.authSocialService.buildGoogleBridgeDeepLink({
        code: input.code,
        nonce: input.nonce,
      });
    }

    const redirectUrl = new URL(input.redirectUri);
    redirectUrl.searchParams.set('code', input.code);
    redirectUrl.searchParams.set('nonce', input.nonce);
    return redirectUrl.toString();
  }

  private normalizeLoopbackRedirectUri(redirectUri?: string): string | null {
    const normalized = redirectUri?.trim();
    if (!normalized) {
      return null;
    }

    if (process.env.NODE_ENV !== 'development') {
      throw new BadRequestException('Invalid oauth redirect uri');
    }

    try {
      return normalizeDevLoopbackRedirectUri(normalized);
    } catch {
      throw new BadRequestException('Invalid oauth redirect uri');
    }
  }
}
