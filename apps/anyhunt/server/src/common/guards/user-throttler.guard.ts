/**
 * User Throttler Guard
 * 基于用户 ID 的限流守卫
 *
 * 限流维度：
 * - API Key 请求：优先 apiKey.id；若全局 guard 阶段尚未完成 apiKey 解析，则使用明文 key 的 sha256
 * - 已登录用户：基于用户 ID
 * - 未登录用户：基于 IP 地址
 */

import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  private getAuthorizationToken(req: Request): string | null {
    const authorization = req.headers?.authorization;
    if (!authorization || typeof authorization !== 'string') {
      return null;
    }
    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token;
  }

  /**
   * 获取限流追踪标识
   * 优先使用 apiKey.id，其次使用 Anyhunt API Key 的 hash，再使用用户 ID，最后回退到 IP 地址
   */
  protected getTracker(req: Request): Promise<string> {
    const apiKey = (req as Request & { apiKey?: { id?: string } }).apiKey;
    if (apiKey?.id) {
      return Promise.resolve(`apiKey:${apiKey.id}`);
    }

    const rawToken = this.getAuthorizationToken(req);
    if (rawToken?.startsWith('ah_')) {
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      return Promise.resolve(`apiKeyHash:${tokenHash}`);
    }

    const user = req.user as { id?: string } | undefined;
    if (user?.id) {
      return Promise.resolve(`user:${user.id}`);
    }
    // 未登录用户使用 IP
    return Promise.resolve(`ip:${req.ip}`);
  }
}
