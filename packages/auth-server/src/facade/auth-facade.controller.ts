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
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthFacadeService } from './auth-facade.service';
import { JwtGuard } from '../guards/jwt.guard';
import { CurrentUser, type RequestUser } from '../decorators/current-user.decorator';
import { ClientType, type ClientTypeValue } from '../decorators/client-type.decorator';
import { AUTH_COOKIE_NAME } from '../constants';
import type {
  RegisterInput,
  VerifyEmailOTPInput,
  LoginInput,
  GoogleStartInput,
  GoogleTokenInput,
  AppleStartInput,
  AppleTokenInput,
} from '../dto';

/**
 * Auth Facade Controller
 *
 * 认证 Facade 路由（/api/v1/auth/*）
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
    const result = await this.authFacadeService.verifyEmailOTP(body);

    // Web: 设置 session cookie（不返回 refreshToken）
    if (clientType === 'web' && result.refreshToken) {
      this.setSessionCookie(res, result.refreshToken);
      // 从响应中移除 refreshToken
      const { refreshToken: _unused, ...webResponse } = result;
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
    const result = await this.authFacadeService.login(body);

    // Web: 设置 session cookie（不返回 refreshToken）
    if (clientType === 'web' && result.refreshToken) {
      this.setSessionCookie(res, result.refreshToken);
      const { refreshToken: _unused, ...webResponse } = result;
      return webResponse;
    }

    return result;
  }

  /**
   * Google 登录启动（Web，预留）
   * POST /api/v1/auth/google/start
   */
  @Post('google/start')
  @HttpCode(HttpStatus.OK)
  async googleStart(@Body() body: GoogleStartInput) {
    return this.authFacadeService.googleStart(body);
  }

  /**
   * Apple 登录启动（Web，预留）
   * POST /api/v1/auth/apple/start
   */
  @Post('apple/start')
  @HttpCode(HttpStatus.OK)
  async appleStart(@Body() body: AppleStartInput) {
    return this.authFacadeService.appleStart(body);
  }

  /**
   * Google idToken 登录（Native，预留）
   * POST /api/v1/auth/google/token
   */
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  async googleToken(
    @Body() body: GoogleTokenInput,
    @ClientType() clientType: ClientTypeValue,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authFacadeService.googleToken(body);

    // Web: 设置 session cookie
    if (clientType === 'web' && result.refreshToken) {
      this.setSessionCookie(res, result.refreshToken);
      const { refreshToken: _unused, ...webResponse } = result;
      return webResponse;
    }

    return result;
  }

  /**
   * Apple idToken 登录（Native，预留）
   * POST /api/v1/auth/apple/token
   */
  @Post('apple/token')
  @HttpCode(HttpStatus.OK)
  async appleToken(
    @Body() body: AppleTokenInput,
    @ClientType() clientType: ClientTypeValue,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authFacadeService.appleToken(body);

    // Web: 设置 session cookie
    if (clientType === 'web' && result.refreshToken) {
      this.setSessionCookie(res, result.refreshToken);
      const { refreshToken: _unused, ...webResponse } = result;
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
    this.enforceWebCsrf(req, clientType);

    const sessionToken = this.extractRefreshToken(req, clientType);

    if (!sessionToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.authFacadeService.refresh(sessionToken, clientType);

    // Web: 更新 session cookie（rotation）
    if (clientType === 'web' && result.newSessionToken) {
      this.setSessionCookie(res, result.newSessionToken);
    }

    // 移除内部字段
    const { newSessionToken: _unused, ...response } = result;
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
    this.enforceWebCsrf(req, clientType);

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
  @UseGuards(JwtGuard)
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

  /**
   * Web Cookie 模式下的 CSRF 防护（refresh/logout）
   */
  private enforceWebCsrf(req: Request, clientType: ClientTypeValue): void {
    if (clientType !== 'web') return;

    const contentType = req.headers['content-type'];
    if (typeof contentType !== 'string' || !contentType.includes('application/json')) {
      throw new ForbiddenException('Invalid content type');
    }

    const origin = req.headers.origin;
    if (typeof origin !== 'string' || origin.length === 0) {
      throw new ForbiddenException('Origin required');
    }

    const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',').filter(Boolean) ?? [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    if (!trustedOrigins.includes(origin) && !origin.endsWith('.anyhunt.app')) {
      throw new ForbiddenException('Untrusted origin');
    }
  }
}
