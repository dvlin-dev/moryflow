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
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { AuthSocialService } from './auth-social.service';
import { AuthTokensService } from './auth.tokens.service';
import { AUTH_SOCIAL_CACHE_CONTROL } from './auth-social.constants';
import { Public } from './decorators';
import { authSocialExchangeSchema, type AuthSocialExchangeDto } from './dto';

@ApiTags('Auth')
@Controller({ path: 'auth/social', version: '1' })
export class AuthSocialController {
  constructor(
    private readonly authService: AuthService,
    private readonly authSocialService: AuthSocialService,
    private readonly authTokensService: AuthTokensService,
  ) {}

  @Public()
  @Get('google/bridge-callback')
  @ApiOperation({ summary: 'OAuth bridge callback for Google sign-in' })
  async googleBridgeCallback(
    @Req() req: Request,
    @Res() res: Response,
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
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
}
