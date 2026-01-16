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
import type { PrismaClient } from '@anyhunt/identity-db';
import { IDENTITY_PRISMA } from '../facade/auth-facade.service';

/**
 * JWT Access Token Guard
 *
 * 仅接受 Authorization: Bearer <accessToken>（JWT 格式）
 * 用于需要 access token 而非 session token 的场景（如 API 调用）
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    @Inject(AUTH_INSTANCE) private readonly auth: Auth,
    @Inject(IDENTITY_PRISMA) private readonly prisma: PrismaClient
  ) {}

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
      // 先用 Better Auth JWT 插件验证 token，再从 DB hydrate 用户（isAdmin/tier/credits 等）
      const verified = await this.auth.api.verifyJWT({
        body: { token: accessToken },
      });

      const userId = verified?.payload?.sub;
      if (typeof userId !== 'string' || userId.length === 0) {
        throw new UnauthorizedException('Invalid access token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
          tier: true,
          creditBalance: true,
          isAdmin: true,
          deletedAt: true,
        },
      });

      if (!user || user.deletedAt) {
        throw new UnauthorizedException('Invalid access token');
      }

      // 将用户信息附加到请求
      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        tier: user.tier,
        creditBalance: user.creditBalance,
        isAdmin: user.isAdmin,
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
