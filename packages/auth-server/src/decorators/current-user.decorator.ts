/**
 * [DEFINES]: @CurrentUser() 装饰器
 * [USED_BY]: Controller 方法参数
 * [POS]: 从请求中提取当前用户信息
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

/**
 * 请求中附加的用户信息类型
 */
export interface RequestUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  tier: 'FREE' | 'STARTER' | 'PRO' | 'MAX';
  creditBalance: number;
  isAdmin: boolean;
}

/**
 * 从请求中提取当前用户信息
 *
 * @example
 * ```typescript
 * @Get('me')
 * @UseGuards(SessionGuard)
 * async getMe(@CurrentUser() user: RequestUser) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user) {
      return undefined;
    }

    // 如果指定了字段名，返回该字段
    if (data) {
      return user[data];
    }

    return user;
  }
);
