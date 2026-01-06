/**
 * [INPUT]: Auth 实例, IdentityPrismaClient, 请求数据
 * [OUTPUT]: 认证响应（access token, refresh token, user info）
 * [POS]: Auth Facade 业务逻辑层
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { Injectable, Inject, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import type { PrismaClient } from '@aiget/identity-db';
import type { Auth } from '../better-auth';
import { AUTH_INSTANCE } from '../guards/session.guard';
import { AUTH_COOKIE_NAME, COOKIE_DOMAIN, SESSION_TTL_SECONDS } from '../constants';
import type {
  RegisterInput,
  RegisterResponse,
  VerifyEmailOTPInput,
  LoginInput,
  AuthResponse,
  GoogleStartInput,
  GoogleStartResponse,
  GoogleTokenInput,
  RefreshResponse,
  MeResponse,
} from '../dto';
import type { ClientTypeValue } from '../decorators';

/**
 * Identity Prisma Client 注入 Token
 */
export const IDENTITY_PRISMA = Symbol('IDENTITY_PRISMA');

/**
 * Auth Facade Service
 *
 * 处理所有认证相关的业务逻辑，包括：
 * - 注册/验证/登录
 * - OAuth（Google）
 * - Token 刷新（带 rotation）
 * - 登出
 */
@Injectable()
export class AuthFacadeService {
  constructor(
    @Inject(AUTH_INSTANCE) private readonly auth: Auth,
    @Inject(IDENTITY_PRISMA) private readonly prisma: PrismaClient
  ) {}

  /**
   * 注册新用户
   */
  async register(input: RegisterInput): Promise<RegisterResponse> {
    // 调用 Better Auth 创建用户
    const result = await this.auth.api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
      },
    });

    if (!result?.user) {
      throw new Error('Failed to create user');
    }

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      next: 'VERIFY_EMAIL_OTP',
    };
  }

  /**
   * 验证邮箱 OTP
   */
  async verifyEmailOTP(
    input: VerifyEmailOTPInput,
    clientType: ClientTypeValue
  ): Promise<AuthResponse> {
    // 调用 Better Auth 验证 OTP
    const result = await this.auth.api.verifyEmailOTP({
      body: {
        email: input.email,
        otp: input.otp,
      },
    });

    if (!result?.user || !result?.token) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // 获取 access token
    const accessToken = await this.getAccessToken(result.token);

    return await this.buildAuthResponse(result.user, accessToken, clientType, result.token);
  }

  /**
   * 邮箱密码登录
   */
  async login(input: LoginInput, clientType: ClientTypeValue): Promise<AuthResponse> {
    const result = await this.auth.api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
      },
    });

    if (!result?.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 检查邮箱是否验证
    if (!result.user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email not verified',
        next: 'VERIFY_EMAIL_OTP',
      });
    }

    // 获取 access token
    const accessToken = await this.getAccessToken(result.token);

    return await this.buildAuthResponse(result.user, accessToken, clientType, result.token);
  }

  /**
   * Google OAuth 启动（Web）
   */
  async googleStart(input: GoogleStartInput): Promise<GoogleStartResponse> {
    const result = await this.auth.api.signInSocial({
      body: {
        provider: 'google',
        callbackURL: input.callbackURL,
        disableRedirect: true,
      },
    });

    if (!result?.url) {
      throw new Error('Failed to initiate Google OAuth');
    }

    return { url: result.url };
  }

  /**
   * Google OAuth idToken 登录（Native）
   */
  async googleToken(input: GoogleTokenInput, clientType: ClientTypeValue): Promise<AuthResponse> {
    const result = await this.auth.api.signInSocial({
      body: {
        provider: 'google',
        idToken: { token: input.idToken },
      },
    });

    // Type guard: redirect flow has `url`, token flow has `user` and `token`
    if (
      !result ||
      result.redirect ||
      !('user' in result) ||
      !result.user ||
      !('token' in result) ||
      !result.token
    ) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    // 获取 access token
    const accessToken = await this.getAccessToken(result.token);

    return await this.buildAuthResponse(result.user, accessToken, clientType, result.token);
  }

  /**
   * 刷新 Token（带 rotation）
   */
  async refresh(
    sessionToken: string,
    clientType: ClientTypeValue
  ): Promise<RefreshResponse & { newSessionToken?: string }> {
    // 查找 session
    const session = await this.prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // 检查用户是否被删除
    if (session.user.deletedAt) {
      throw new ForbiddenException('Account has been deleted');
    }

    // Rotation: 生成新的 session token
    const newToken = this.generateSessionToken();
    const newExpiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

    // 原子更新：只有当 token 匹配时才更新
    const updatedSession = await this.prisma.session.updateMany({
      where: {
        id: session.id,
        token: sessionToken, // 确保 token 没有被其他请求更新
      },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      },
    });

    if (updatedSession.count === 0) {
      throw new UnauthorizedException('Session token has been rotated');
    }

    // 获取新的 access token
    const accessToken = await this.getAccessToken(newToken);

    const response: RefreshResponse & { newSessionToken?: string } = {
      accessToken,
    };

    // Native 返回新的 refresh token
    if (clientType === 'native') {
      response.refreshToken = newToken;
    }

    // 返回新 session token 供 controller 设置 cookie
    response.newSessionToken = newToken;

    return response;
  }

  /**
   * 登出
   */
  async logout(sessionToken: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { token: sessionToken },
    });
  }

  /**
   * 获取当前用户信息
   */
  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      tier: user.tier,
      creditBalance: user.creditBalance,
      isAdmin: user.isAdmin,
      profile: user.profile
        ? {
            nickname: user.profile.nickname,
            avatar: user.profile.avatar,
            locale: user.profile.locale,
            timezone: user.profile.timezone,
          }
        : null,
    };
  }

  /**
   * 构建认证响应
   */
  private async buildAuthResponse(
    user: { id: string; email: string; name?: string | null; emailVerified?: boolean },
    accessToken: string,
    clientType: ClientTypeValue,
    sessionToken?: string
  ): Promise<AuthResponse> {
    // 从数据库获取用户的 tier 和 isAdmin
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { tier: true, isAdmin: true },
    });

    const response: AuthResponse = {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        emailVerified: user.emailVerified ?? false,
        tier: dbUser?.tier ?? 'FREE',
        isAdmin: dbUser?.isAdmin ?? false,
      },
    };

    // Native 返回 refresh token
    if (clientType === 'native' && sessionToken) {
      response.refreshToken = sessionToken;
    }

    return response;
  }

  /**
   * 获取 Access Token（JWT）
   */
  private async getAccessToken(sessionToken: string): Promise<string> {
    // 使用 Better Auth 的 token endpoint 获取 JWT
    // 验证 session 有效性
    await this.auth.api.getSession({
      headers: new Headers({
        cookie: `${AUTH_COOKIE_NAME}=${sessionToken}`,
      }),
    });

    // 从 Better Auth JWT 插件获取 token
    // 注意：实际实现可能需要调用 /api/auth/token 端点
    // 这里简化处理，直接使用 session token 作为临时方案
    // TODO: 实现正确的 JWT token 获取
    return sessionToken;
  }

  /**
   * 生成随机 session token
   */
  private generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 创建 session cookie 选项
   */
  createSessionCookieOptions(): {
    name: string;
    domain: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
  } {
    return {
      name: AUTH_COOKIE_NAME,
      domain: COOKIE_DOMAIN,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
    };
  }
}
