/**
 * [PROVIDES]: buildPublicConfig, buildInternalConfig
 * [DEPENDS]: @nestjs/swagger DocumentBuilder
 * [POS]: OpenAPI 文档配置构建器
 */

import { Injectable } from '@nestjs/common';
import { DocumentBuilder } from '@nestjs/swagger';

@Injectable()
export class OpenApiService {
  /**
   * 构建公开 API 文档配置
   */
  buildPublicConfig() {
    return new DocumentBuilder()
      .setTitle('Moryflow API')
      .setDescription('Moryflow 公开 API 文档')
      .setVersion('2.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addCookieAuth('better-auth.session_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
      })
      .addTag('Health', '健康检查')
      .addTag('Auth', '认证')
      .addTag('License', 'License 管理')
      .addTag('Payment', '支付')
      .addTag('AI', 'AI 服务')
      .addTag('Storage', '文件存储')
      .addTag('Sync', '数据同步')
      .addTag('Site', '站点发布')
      .addTag('Speech', '语音服务')
      .addTag('Search', '搜索服务')
      .addTag('Activity Log', '活动日志')
      .build();
  }

  /**
   * 构建内部 API 文档配置（仅开发环境）
   */
  buildInternalConfig() {
    return new DocumentBuilder()
      .setTitle('Moryflow Internal API')
      .setDescription('Moryflow 内部 API 文档（管理后台）')
      .setVersion('2.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addCookieAuth('better-auth.session_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
      })
      .addTag('Admin', '管理员功能')
      .addTag('Admin Payment', '支付管理')
      .addTag('Admin Storage', '存储管理')
      .addTag('Admin Site', '站点管理')
      .addTag('Agent Trace', 'Agent 追踪')
      .addTag('Alert', '警报管理')
      .addTag('Quota', '配额管理')
      .addTag('AI Admin', 'AI 管理')
      .addTag('Vectorize', '向量化服务')
      .build();
  }
}
