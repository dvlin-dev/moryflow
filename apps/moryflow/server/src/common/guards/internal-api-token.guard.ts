/**
 * [INPUT]: Authorization Bearer token
 * [OUTPUT]: 是否允许访问内部路由
 * [POS]: 内部只读/运维路由统一鉴权守卫
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const parseBearerToken = (authorization: string | undefined): string | null => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
};

@Injectable()
export class InternalApiTokenGuard implements CanActivate {
  private readonly token: string;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService
      .get<string>('INTERNAL_API_TOKEN', '')
      .trim();
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.token) {
      throw new ServiceUnavailableException(
        'Internal API token is not configured',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const candidate = parseBearerToken(request.header('authorization'));
    if (!candidate) {
      throw new UnauthorizedException('Missing internal API token');
    }

    if (candidate.length !== this.token.length) {
      throw new UnauthorizedException('Invalid internal API token');
    }

    const isMatch = timingSafeEqual(
      Buffer.from(candidate, 'utf8'),
      Buffer.from(this.token, 'utf8'),
    );
    if (!isMatch) {
      throw new UnauthorizedException('Invalid internal API token');
    }

    return true;
  }
}
