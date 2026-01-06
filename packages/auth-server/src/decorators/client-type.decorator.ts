/**
 * [DEFINES]: @ClientType() 装饰器
 * [USED_BY]: Controller 方法参数
 * [POS]: 从请求头提取客户端类型
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { CLIENT_TYPE_HEADER, ClientType as ClientTypeEnum } from '../constants';

export type ClientTypeValue = 'web' | 'native';

/**
 * 从请求头提取客户端类型
 *
 * 规则：
 * - 读取 X-Client-Type header
 * - 如果值为 'native'，返回 'native'
 * - 否则默认返回 'web'（更安全）
 *
 * @example
 * ```typescript
 * @Post('login')
 * async login(
 *   @Body() dto: LoginDto,
 *   @ClientType() clientType: ClientTypeValue,
 * ) {
 *   // clientType 为 'web' 或 'native'
 * }
 * ```
 */
export const ClientType = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientTypeValue => {
    const request = ctx.switchToHttp().getRequest();
    const headerValue = request.headers[CLIENT_TYPE_HEADER];

    // 只有明确声明为 native 时才返回 native，否则默认 web（更安全）
    if (headerValue === ClientTypeEnum.NATIVE) {
      return 'native';
    }

    return 'web';
  }
);
