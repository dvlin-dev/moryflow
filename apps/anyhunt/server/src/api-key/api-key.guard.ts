/**
 * [INPUT]: Request with Authorization: Bearer <apiKey>
 * [OUTPUT]: Boolean (allowed/denied), attaches ApiKeyValidationResult to request
 * [POS]: Authentication guard for public API endpoints, validates API keys (非全局 guard)
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import type { ApiKeyValidationResult } from './api-key.types';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  private getApiKeyFromHeaders(request: Request): string | null {
    const authorization = request.headers.authorization;
    if (authorization && typeof authorization === 'string') {
      const [scheme, token] = authorization.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && token) {
        return token;
      }
    }

    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.getApiKeyFromHeaders(request);

    if (!apiKey) {
      throw new ForbiddenException(
        'Missing API key (use Authorization: Bearer <apiKey>)',
      );
    }

    // 验证 API Key
    const result = await this.apiKeyService.validateKey(apiKey);

    // 将 API Key 信息和用户附加到请求对象
    (request as Request & { apiKey?: ApiKeyValidationResult }).apiKey = result;
    request.user = result.user;

    return true;
  }
}
