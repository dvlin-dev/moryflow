/**
 * [INPUT]: refresh/logout/sign-out 请求（Body refreshToken）
 * [OUTPUT]: accessToken 刷新结果或登出响应
 * [POS]: Auth Token 入口（/api/v1/auth/*，Token-first，无 Cookie/Session fallback）
 */

import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Public } from './decorators';
import { AuthTokensService } from './auth.tokens.service';
import {
  refreshTokenSchema,
  logoutSchema,
  type RefreshTokenDto,
  type LogoutDto,
} from './dto';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthTokensController {
  constructor(private readonly tokensService: AuthTokensService) {}

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ) {
    const refreshToken = dto.refreshToken.trim();
    const refreshResult = await this.tokensService.rotateRefreshToken(
      refreshToken,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      },
    );

    if (!refreshResult) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = await this.tokensService.createAccessToken(
      refreshResult.user.id,
    );

    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
      refreshToken: refreshResult.refreshToken.token,
      refreshTokenExpiresAt: refreshResult.refreshToken.expiresAt.toISOString(),
    };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodValidationPipe(logoutSchema)) dto: LogoutDto,
  ) {
    await this.tokensService.revokeRefreshToken(dto.refreshToken.trim());
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    return { message: 'Logout successful' };
  }

  @Public()
  @Post('sign-out')
  @ApiOperation({ summary: 'Sign out and revoke refresh token' })
  async signOut(
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodValidationPipe(logoutSchema)) dto: LogoutDto,
  ) {
    await this.tokensService.revokeRefreshToken(dto.refreshToken.trim());
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    return { message: 'Logout successful' };
  }
}
