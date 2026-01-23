/**
 * [INPUT]: ExpressRequest（Cookie/Headers）与 Auth 配置依赖
 * [OUTPUT]: Better Auth 实例与可验证的用户会话信息
 * [POS]: 认证核心服务，封装 Better Auth 实例与会话查询
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import { createBetterAuth, Auth } from './better-auth';
import type { CurrentUserDto } from '../types';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private auth!: Auth;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.auth = createBetterAuth(
      this.prisma,
      this.emailService.sendOTP.bind(this.emailService),
      {
        get: (key) => this.redis.get(key),
        set: (key, value, ttl) => this.redis.set(key, value, ttl),
        delete: (key) => this.redis.del(key),
      },
    );
  }

  /**
   * 获取 Better Auth 实例
   */
  getAuth(): Auth {
    return this.auth;
  }

  /**
   * 从 Express Request 中获取 Session
   * 返回完整的用户信息（包括 tier 和 isAdmin）
   */
  async getSessionFromRequest(req: ExpressRequest): Promise<{
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

    const session = await this.auth.api.getSession({ headers });

    if (!session) {
      return null;
    }

    // Better Auth 的 session.user 只包含基础字段
    // 需要从数据库获取完整的用户信息（包括订阅与 isAdmin）
    const fullUser = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        deletedAt: true,
        subscription: {
          select: { tier: true },
        },
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
        subscriptionTier: fullUser.subscription?.tier ?? 'free',
        isAdmin: fullUser.isAdmin,
      },
    };
  }
}
