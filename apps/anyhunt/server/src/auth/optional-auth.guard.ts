/**
 * [INPUT]: Express Request（可选 Authorization: Bearer <accessToken>）
 * [OUTPUT]: request.user / request.session（若 token 有效）
 * [POS]: Public 路由的可选鉴权（用于识别登录用户，不阻断匿名访问）
 */
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthTokensService } from './auth.tokens.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly tokensService: AuthTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.user) {
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.substring(7);

    try {
      const session = await this.tokensService.verifyAccessToken(token);
      if (session) {
        request.user = session.user;
        request.session = session.session;
      }
    } catch {
      // 可选鉴权：token 异常时降级为匿名
    }

    return true;
  }
}
