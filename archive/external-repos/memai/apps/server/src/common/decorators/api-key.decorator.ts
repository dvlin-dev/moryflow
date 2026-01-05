/**
 * [POS]: API Key 相关装饰器
 *
 * 用于从请求上下文中获取 API Key 信息
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ApiKeyIsolationRequest } from '../interceptors/api-key-isolation.interceptor';

/**
 * 获取当前请求的 API Key ID
 *
 * @example
 * @Get()
 * async list(@ApiKeyId() apiKeyId: string) {
 *   return this.memoryService.list(apiKeyId);
 * }
 */
export const ApiKeyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<ApiKeyIsolationRequest>();
    return request.apiKeyId ?? '';
  },
);

/**
 * 获取当前请求的平台用户 ID
 * (API Key 所属的用户)
 *
 * @example
 * @Get()
 * async getOwner(@PlatformUserId() userId: string) {
 *   return this.userService.findById(userId);
 * }
 */
export const PlatformUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<ApiKeyIsolationRequest>();
    return request.platformUserId ?? '';
  },
);
