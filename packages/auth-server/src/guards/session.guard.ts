/**
 * [INPUT]: Request with Better Auth session cookie or Bearer token
 * [OUTPUT]: Validated user attached to request
 * [POS]: Better Auth session 校验 Guard（控制台用）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { AUTH_COOKIE_NAME } from '../constants';
import type { Auth } from '../better-auth';

/**
 * Auth 实例注入 Token
 */
export const AUTH_INSTANCE = Symbol('AUTH_INSTANCE');

/**
 * Better Auth Session Guard
 *
 * 验证方式：
 * 1. 优先从 Cookie 读取 session token
 * 2. 如果没有 cookie，从 Authorization: Bearer <token> 读取
 *
 * 成功后将用户信息附加到 request.user
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AUTH_INSTANCE) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 从 cookie 或 header 获取 session token
    const sessionToken = this.extractSessionToken(request);

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    try {
      // 使用 Better Auth 的 API 验证 session
      const session = await this.auth.api.getSession({
        headers: new Headers({
          cookie: `${AUTH_COOKIE_NAME}=${sessionToken}`,
        }),
      });

      if (!session?.user) {
        throw new UnauthorizedException('Invalid session');
      }

      // 将用户信息附加到请求
      request.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified,
        tier: (session.user as { tier?: string }).tier ?? 'FREE',
        creditBalance: (session.user as { creditBalance?: number }).creditBalance ?? 0,
        isAdmin: (session.user as { isAdmin?: boolean }).isAdmin ?? false,
      };

      // 保存原始 session 供后续使用
      request.session = session.session;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Session validation failed');
    }
  }

  /**
   * 从请求中提取 session token
   */
  private extractSessionToken(request: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  }): string | undefined {
    // 1. 优先从 cookie 读取
    const cookieToken = request.cookies?.[AUTH_COOKIE_NAME];
    if (cookieToken) {
      return cookieToken;
    }

    // 2. 从 Authorization header 读取
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return undefined;
  }
}
