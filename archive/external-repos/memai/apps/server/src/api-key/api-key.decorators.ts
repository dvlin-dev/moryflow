/**
 * API Key decorators
 *
 * [PROVIDES]: UseApiKey, CurrentApiKey
 * [USED_BY]: Controllers needing API Key authentication
 */

import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { ApiKeyValidationResult } from './dto';

/** 元数据 key：标记路由需要 API Key 认证 */
export const USE_API_KEY = 'useApiKey';

/**
 * 标记路由需要 API Key 认证
 * 使用此装饰器的路由将通过 X-API-Key 头验证
 */
export const UseApiKey = () => SetMetadata(USE_API_KEY, true);

/**
 * 获取当前请求的 API Key 信息
 * 用于获取已验证的 API Key 详情
 */
export const CurrentApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyValidationResult | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { apiKey?: ApiKeyValidationResult }).apiKey;
  },
);
