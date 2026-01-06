/**
 * [INPUT]: Request with authenticated user
 * [OUTPUT]: Access granted or 403 Forbidden
 * [POS]: 管理员权限校验 Guard
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '@aiget/auth-server';

/**
 * Admin Guard
 *
 * 检查当前用户是否为管理员（user.isAdmin === true）
 * 需要配合 SessionGuard 使用
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
