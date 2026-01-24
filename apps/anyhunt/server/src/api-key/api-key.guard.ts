/**
 * [INPUT]: Request with Authorization: Token <apiKey>
 * [OUTPUT]: Boolean (allowed/denied), attaches ApiKeyValidationResult to request
 * [POS]: Authentication guard for public API endpoints, validates API keys (非全局 guard)
 *
 * [PROTOCOL]: When this file changes, update this header and src/api-key/CLAUDE.md
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
      if (scheme?.toLowerCase() === 'token' && token) {
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
        'Missing API key (use Authorization: Token <apiKey>)',
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
