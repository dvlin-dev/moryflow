/**
 * [INPUT]: Request with JWT access token in Authorization header
 * [OUTPUT]: Validated user attached to request
 * [POS]: JWT Access Token 校验 Guard（API 用）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Auth } from '../better-auth';
import { AUTH_INSTANCE } from './session.guard';

/**
 * JWT Access Token Guard
 *
 * 仅接受 Authorization: Bearer <accessToken>（JWT 格式）
 * 用于需要 access token 而非 session token 的场景（如 API 调用）
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(@Inject(AUTH_INSTANCE) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 只从 Authorization header 读取 JWT
    const authHeader = request.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No access token provided');
    }

    const accessToken = authHeader.slice(7);
    if (!accessToken) {
      throw new UnauthorizedException('No access token provided');
    }

    try {
      // 使用 Better Auth JWT 插件验证 token
      // 注意：这里需要使用 Better Auth 的 JWT 验证方法
      const result = await this.auth.api.getSession({
        headers: new Headers({
          authorization: `Bearer ${accessToken}`,
        }),
      });

      if (!result?.user) {
        throw new UnauthorizedException('Invalid access token');
      }

      // 将用户信息附加到请求
      request.user = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        emailVerified: result.user.emailVerified,
        tier: (result.user as { tier?: string }).tier ?? 'FREE',
        creditBalance: (result.user as { creditBalance?: number }).creditBalance ?? 0,
        isAdmin: (result.user as { isAdmin?: boolean }).isAdmin ?? false,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Access token validation failed');
    }
  }
}
