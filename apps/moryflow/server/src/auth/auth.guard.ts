/**
 * [INPUT]: Authorization: Bearer <accessToken>
 * [OUTPUT]: 注入 request.user/session 或抛出 401
 * [POS]: 全局鉴权守卫（Moryflow API 入口）
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthTokensService } from './auth.tokens.service';
import { IS_PUBLIC_KEY } from './decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokensService: AuthTokensService,
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

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token');
    }

    const token = authHeader.substring(7);
    const session = await this.tokensService.verifyAccessToken(token);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    request.user = session.user;
    request.session = session.session;
    return true;
  }
}
