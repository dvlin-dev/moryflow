/**
 * [INPUT]: HTTP 请求
 * [OUTPUT]: 认证响应（JSON + Cookie）
 * [POS]: Auth Facade 路由控制器（/api/v1/auth/*）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthFacadeService } from './auth-facade.service';
import { SessionGuard } from '../guards/session.guard';
import { CurrentUser, type RequestUser } from '../decorators/current-user.decorator';
import { ClientType, type ClientTypeValue } from '../decorators/client-type.decorator';
import { AUTH_COOKIE_NAME } from '../constants';
import type {
  RegisterInput,
  VerifyEmailOTPInput,
  LoginInput,
  GoogleStartInput,
  GoogleTokenInput,
} from '../dto';

/**
 * Auth Facade Controller
 *
 * 统一用户系统 Facade 路由（/api/v1/auth/*）
 * 负责抹平 Web/Native 差异：
 * - Web: refresh token 放 HttpOnly Cookie
 * - Native: refresh token 放响应体
 */
@Controller({ path: 'auth', version: '1' })
export class AuthFacadeController {
  constructor(private readonly authFacadeService: AuthFacadeService) {}

  /**
   * 注册
   * POST /api/v1/auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() body: RegisterInput) {
    return this.authFacadeService.register(body);
  }

  /**
   * 验证邮箱 OTP
   * POST /api/v1/auth/verify-email-otp
   */
  @Post('verify-email-otp')
  @HttpCode(HttpStatus.OK)
  async verifyEmailOTP(
    @Body() body: VerifyEmailOTPInput,
    @ClientType() clientType: ClientTypeValue,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authFacadeService.verifyEmailOTP(body, clientType);

    // Web: 设置 session cookie（不返回 refreshToken）
    if (clientType === 'web' && result.refreshToken) {
      this.setSessionCookie(res, result.refreshToken);
      // 从响应中移除 refreshToken
      const { refreshToken: _, ...webResponse } = result;
      return webResponse;
    }

    return result;
  }

  /**
   * 登录
   * POST /api/v1/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginInput,
    @ClientType() clientType: ClientTypeValue,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authFacadeService.login(body, clientType);

    // Web: 设置 session cookie（不返回 refreshToken）
    if (clientType === 'web' && result.refreshToken) {
      this.setSessionCookie(res, result.refreshToken);
      const { refreshToken: _, ...webResponse } = result;
      return webResponse;
    }

    return result;
  }

  /**
   * Google OAuth 启动（Web）
   * POST /api/v1/auth/google/start
   */
  @Post('google/start')
  @HttpCode(HttpStatus.OK)
  async googleStart(@Body() body: GoogleStartInput) {
    return this.authFacadeService.googleStart(body);
  }

  /**
   * Google OAuth idToken 登录（Native）
   * POST /api/v1/auth/google/token
   */
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  async googleToken(
    @Body() body: GoogleTokenInput,
    @ClientType() clientType: ClientTypeValue,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authFacadeService.googleToken(body, clientType);

    // Web: 设置 session cookie
    if (clientType === 'web' && result.refreshToken) {
      this.setSessionCookie(res, result.refreshToken);
      const { refreshToken: _, ...webResponse } = result;
      return webResponse;
    }

    return result;
  }

  /**
   * 刷新 Token
   * POST /api/v1/auth/refresh
   *
   * Web: 从 cookie 读取 session token
   * Native: 从 Authorization: Bearer <refreshToken> 读取
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @ClientType() clientType: ClientTypeValue,
    @Res({ passthrough: true }) res: Response
  ) {
    const sessionToken = this.extractRefreshToken(req, clientType);

    if (!sessionToken) {
      return {
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token provided',
        },
      };
    }

    const result = await this.authFacadeService.refresh(sessionToken, clientType);

    // Web: 更新 session cookie（rotation）
    if (clientType === 'web' && result.newSessionToken) {
      this.setSessionCookie(res, result.newSessionToken);
    }

    // 移除内部字段
    const { newSessionToken: _, ...response } = result;
    return response;
  }

  /**
   * 登出
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @ClientType() clientType: ClientTypeValue,
    @Res({ passthrough: true }) res: Response
  ) {
    const sessionToken = this.extractRefreshToken(req, clientType);

    if (sessionToken) {
      await this.authFacadeService.logout(sessionToken);
    }

    // 清除 cookie
    this.clearSessionCookie(res);

    return { success: true };
  }

  /**
   * 获取当前用户信息
   * GET /api/v1/auth/me
   *
   * 需要 access token（JWT）
   */
  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: RequestUser) {
    return this.authFacadeService.me(user.id);
  }

  /**
   * 从请求中提取 refresh token
   */
  private extractRefreshToken(req: Request, clientType: ClientTypeValue): string | undefined {
    // Web: 从 cookie 读取
    if (clientType === 'web') {
      return req.cookies?.[AUTH_COOKIE_NAME];
    }

    // Native: 从 Authorization header 读取
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 兼容：也检查 cookie（Native 端可能也带了 cookie）
    return req.cookies?.[AUTH_COOKIE_NAME];
  }

  /**
   * 设置 session cookie
   */
  private setSessionCookie(res: Response, token: string): void {
    const options = this.authFacadeService.createSessionCookieOptions();
    res.cookie(options.name, token, {
      domain: options.domain,
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      maxAge: options.maxAge * 1000, // Express 使用毫秒
    });
  }

  /**
   * 清除 session cookie
   */
  private clearSessionCookie(res: Response): void {
    const options = this.authFacadeService.createSessionCookieOptions();
    res.clearCookie(options.name, {
      domain: options.domain,
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
    });
  }
}
