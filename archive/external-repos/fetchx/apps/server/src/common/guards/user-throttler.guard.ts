/**
 * User Throttler Guard
 * 基于用户 ID 的限流守卫
 *
 * 限流维度：
 * - 已登录用户：基于用户 ID
 * - 未登录用户：基于 IP 地址
 */

import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  /**
   * 获取限流追踪标识
   * 优先使用用户 ID，否则回退到 IP 地址
   */
  protected async getTracker(req: Request): Promise<string> {
    const user = req.user;
    if (user?.id) {
      return `user:${user.id}`;
    }
    // 未登录用户使用 IP
    return `ip:${req.ip}`;
  }
}
