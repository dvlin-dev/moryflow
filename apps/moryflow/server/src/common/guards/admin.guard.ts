/**
 * Admin Guard
 * 纯权限检查器：验证当前用户是否为管理员
 *
 * 前置条件：全局 AuthGuard 已完成身份认证，request.user 已填充
 * 职责：
 * - 检查 @Public() 装饰器，如果是公开路由则跳过
 * - 检查 isAdmin 字段，验证管理员权限
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../auth/decorators';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 检查是否标记为 @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    // 用户信息应由全局 AuthGuard 填充
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // 检查管理员权限
    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
