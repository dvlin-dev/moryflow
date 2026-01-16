import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiKeyValidationResult } from './api-key.types';

/**
 * 获取当前请求的 API Key 信息
 * 用于获取已验证的 API Key 详情
 */
export const CurrentApiKey = createParamDecorator(
  (
    _data: unknown,
    ctx: ExecutionContext,
  ): ApiKeyValidationResult | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { apiKey?: ApiKeyValidationResult }).apiKey;
  },
);
