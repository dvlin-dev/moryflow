/**
 * [INPUT]: (ExpressRequest | token: string) - HTTP 请求或 Bearer Token
 * [OUTPUT]: (Session & User) | null - 用户会话与完整用户信息
 * [POS]: 认证核心服务，基于 Better Auth，被所有需要鉴权的接口依赖
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import { createBetterAuth, Auth } from './better-auth';
import type { CurrentUserDto } from '../types';

@Injectable()
export class AuthService implements OnModuleInit {
  private authWeb!: Auth;
  private authDevice!: Auth;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    this.authWeb = createBetterAuth(
      this.prisma,
      this.emailService.sendOTP.bind(this.emailService),
      { disableCSRFCheck: false },
    );

    this.authDevice = createBetterAuth(
      this.prisma,
      this.emailService.sendOTP.bind(this.emailService),
      { disableCSRFCheck: true },
    );
  }

  /**
   * 获取 Better Auth 实例
   */
  getAuth(): Auth {
    return this.authWeb;
  }

  /**
   * 根据请求来源选择 Auth 实例
   */
  getAuthForRequest(req: ExpressRequest): Auth {
    const origin = req.headers.origin as string | string[] | undefined;
    const hasOrigin =
      typeof origin === 'string'
        ? origin.trim().length > 0
        : Array.isArray(origin) && origin.length > 0;

    if (hasOrigin) {
      return this.authWeb;
    }

    if (this.isDeviceRequest(req)) {
      return this.authDevice;
    }

    throw new UnauthorizedException('Invalid auth request');
  }

  /**
   * 从 Express Request 中获取 Session
   * 返回完整的用户信息（包括 tier 和 isAdmin）
   */
  async getSession(req: ExpressRequest): Promise<{
    session: { id: string; expiresAt: Date };
    user: CurrentUserDto;
  } | null> {
    const headers = new Headers();

    // 复制请求头
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      }
    }

    const session = await this.getAuthForRequest(req).api.getSession({
      headers,
    });

    if (!session) {
      return null;
    }

    // Better Auth 的 session.user 只包含基础字段
    // 需要从数据库获取完整的用户信息（包括 tier 和 isAdmin）
    const fullUser = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        isAdmin: true,
        deletedAt: true,
      },
    });

    // 用户不存在或已被软删除
    if (!fullUser || fullUser.deletedAt) {
      return null;
    }

    return {
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
      },
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        tier: fullUser.tier as CurrentUserDto['tier'],
        isAdmin: fullUser.isAdmin,
      },
    };
  }

  /**
   * 验证用户是否是管理员
   */
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    return user?.isAdmin ?? false;
  }

  /**
   * 根据 Token 获取 Session（用于 API 认证）
   */
  async getSessionByToken(token: string): Promise<{
    session: { id: string; token: string; expiresAt: Date };
    user: CurrentUserDto;
  } | null> {
    // 查找有效的 session
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    // session 不存在、已过期、或用户已被软删除
    if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
      return null;
    }

    return {
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        tier: session.user.tier as CurrentUserDto['tier'],
        isAdmin: session.user.isAdmin,
      },
    };
  }

  private isDeviceRequest(req: ExpressRequest): boolean {
    const authorization = req.headers.authorization;
    const hasBearer =
      typeof authorization === 'string' &&
      authorization.toLowerCase().startsWith('bearer ');

    const appPlatform = req.headers['x-app-platform'];
    const hasPlatform =
      typeof appPlatform === 'string'
        ? appPlatform.trim().length > 0
        : Array.isArray(appPlatform) && appPlatform.some(Boolean);

    return hasBearer || hasPlatform;
  }
}
