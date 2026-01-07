/**
 * [INPUT]: Request with X-API-Key header
 * [OUTPUT]: Boolean (allowed/denied), attaches ApiKeyValidationResult to request
 * [POS]: Authentication guard for public API endpoints, validates API keys
 *
 * [PROTOCOL]: When this file changes, update this header and src/api-key/CLAUDE.md
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import { USE_API_KEY } from './api-key.decorators';
import type { ApiKeyValidationResult } from './api-key.types';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查路由是否需要 API Key 认证
    const useApiKey = this.reflector.getAllAndOverride<boolean>(USE_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!useApiKey) {
      return true; // 非 API Key 路由，交给其他 guard 处理
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new ForbiddenException('Missing X-API-Key header');
    }

    // 验证 API Key
    const result = await this.apiKeyService.validateKey(apiKey);

    // 将 API Key 信息和用户附加到请求对象
    (request as Request & { apiKey?: ApiKeyValidationResult }).apiKey = result;
    request.user = result.user;

    return true;
  }
}
