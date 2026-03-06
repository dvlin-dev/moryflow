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
      .setTitle('Anyhunt API')
      .setDescription('Anyhunt 公开 API 文档')
      .setVersion('1.0')
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'Authorization' },
        'apiKey',
      )
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addCookieAuth(
        'better-auth.session_token',
        { type: 'apiKey', in: 'cookie' },
        'session',
      )
      .addTag('Health', '健康检查')
      .addTag('Auth', '认证')
      .addTag('User', '用户相关')
      .addTag('Payment', '支付相关')
      .addTag('API Keys', 'API Key 管理')
      .addTag('Fetchx', '抓取/爬取/提取能力')
      .addTag('Memox', '记忆与实体能力')
      .addTag('Digest', '订阅与收件箱')
      .addTag('Agent', 'Agent 能力')
      .build();
  }

  /**
   * 构建内部 API 文档配置
   */
  buildInternalConfig() {
    return new DocumentBuilder()
      .setTitle('Anyhunt Internal API')
      .setDescription('Anyhunt 内部 API 文档（Admin / Internal）')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addCookieAuth(
        'better-auth.session_token',
        { type: 'apiKey', in: 'cookie' },
        'session',
      )
      .addTag('Admin', '管理后台')
      .addTag('Admin Digest', 'Digest 后台管理')
      .addTag('Admin LLM', 'LLM 管理')
      .build();
  }
}
