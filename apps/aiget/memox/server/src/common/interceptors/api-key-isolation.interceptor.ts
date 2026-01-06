/**
 * [POS]: API Key 数据隔离拦截器
 *
 * 职责：自动注入 apiKeyId 到请求上下文，供 Service 层使用
 * 用于核心数据表 (Memory/Entity/Relation) 的多租户隔离
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

export interface ApiKeyIsolationRequest {
  apiKey?: {
    id: string;
    userId: string;
  };
  apiKeyId?: string;
  platformUserId?: string;
}

@Injectable()
export class ApiKeyDataIsolationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<ApiKeyIsolationRequest>();
    const apiKey = request.apiKey; // 由 ApiKeyGuard 注入

    if (!apiKey) {
      throw new UnauthorizedException('API Key required');
    }

    // 注入 apiKeyId 到请求上下文，供 Service 层使用
    request.apiKeyId = apiKey.id;
    request.platformUserId = apiKey.userId; // 平台用户 ID

    return next.handle();
  }
}
