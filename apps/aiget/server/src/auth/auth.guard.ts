import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否是公开路由
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // 1. 尝试 Bearer Token 认证（Admin 使用）
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = await this.authService.getSessionByToken(token);

      if (session) {
        request.user = session.user;
        request.session = session.session;
        return true;
      }
    }

    // 2. 尝试 Cookie-based session 认证（Better Auth）
    const session = await this.authService.getSession(request);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // 附加用户信息到请求对象（使用扩展后的 Request 类型）
    request.user = session.user;
    request.session = session.session;

    return true;
  }
}
