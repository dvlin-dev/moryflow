/**
 * Express Request 类型扩展
 * 扩展 Express Request 对象以包含认证信息
 */

import type { CurrentUserDto } from './user.types';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';

declare global {
  namespace Express {
    interface Request {
      /** 当前已认证用户 */
      user?: CurrentUserDto;
      /** 当前会话信息 */
      session?: {
        id: string;
        tokenType?: 'access';
        expiresAt: Date;
      };
      /** Public API Key 验证结果（ApiKeyGuard 注入） */
      apiKey?: ApiKeyValidationResult;
      /** 链路请求 ID */
      requestId?: string;
      /** 原始请求体（用于 webhook 签名验证） */
      rawBody?: Buffer;
    }
  }
}

export {};
