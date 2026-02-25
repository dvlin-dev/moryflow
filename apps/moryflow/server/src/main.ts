/**
 * [INPUT]: 环境变量（PORT/ALLOWED_ORIGINS/...）与反代请求头（X-Forwarded-Proto/Host）
 * [OUTPUT]: 启动 NestJS HTTP 服务并挂载中间件/OpenAPI/各业务模块
 * [POS]: Moryflow Server 入口（反代部署必须启用 trust proxy）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/moryflow/server/CLAUDE.md`
 */

import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType, type INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import {
  json,
  urlencoded,
  type Application,
  type Request,
  type Response,
} from 'express';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';
import {
  OpenApiService,
  SCALAR_CONFIG,
  createScalarMiddleware,
} from './openapi';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// 公开 API 模块
import { HealthModule } from './health';
import { AuthModule } from './auth';
import { LicenseModule } from './license';
import { PaymentModule } from './payment';
import { AiProxyModule } from './ai-proxy';
import { AiImageModule } from './ai-image';
import { SpeechModule } from './speech';
import { SearchModule } from './search';
import { StorageModule } from './storage';
import { SyncModule } from './sync';
import { SiteModule } from './site';
import { ActivityLogModule } from './activity-log';

// 内部 API 模块
import { AdminModule } from './admin';
import { AdminPaymentModule } from './admin-payment';
import { AdminStorageModule } from './admin-storage';
import { AgentTraceModule } from './agent-trace';
import { AiAdminModule } from './ai-admin';
import { AlertModule } from './alert';
import { QuotaModule } from './quota';
import { VectorizeModule } from './vectorize';

// ==========================================
// OpenAPI 模块列表
// ==========================================

/** 公开 API 模块（面向客户端） */
const PUBLIC_API_MODULES = [
  HealthModule,
  AuthModule,
  LicenseModule,
  PaymentModule,
  AiProxyModule,
  AiImageModule,
  SpeechModule,
  SearchModule,
  StorageModule,
  SyncModule,
  SiteModule,
  ActivityLogModule,
];

/** 内部 API 模块（面向管理后台，仅开发环境） */
const INTERNAL_API_MODULES = [
  AdminModule,
  AdminPaymentModule,
  AdminStorageModule,
  AgentTraceModule,
  AiAdminModule,
  AlertModule,
  QuotaModule,
  VectorizeModule,
];

/**
 * 检查 origin 是否匹配模式
 * 支持通配符子域名，如 https://*.moryflow.com
 */
function matchOrigin(origin: string, pattern: string): boolean {
  // 精确匹配
  if (origin === pattern) return true;

  // 通配符匹配: https://*.domain.com
  if (pattern.includes('*')) {
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace('*', '[a-zA-Z0-9-]+') + '$',
    );
    return regex.test(origin);
  }

  return false;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // 保留原始请求体用于 Webhook 签名验证
    rawBody: true,
  });

  // 反代部署必须启用 trust proxy，否则 req.protocol/secure cookie 等会被错误识别为 http。
  // 单层反代（megaboxpro/1panel）默认设置为 1；如未来有多层代理再按 hop 数调整。
  (app.getHttpAdapter().getInstance() as Application).set('trust proxy', 1);

  // 增加请求体大小限制（默认 100kb，增加到 50mb）
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // 请求 ID（用于 RFC7807 错误体与链路排查）
  app.use((req: Request, res: Response, next: (err?: unknown) => void) => {
    const header = req.headers['x-request-id'];
    const requestId =
      typeof header === 'string' && header.trim().length > 0
        ? header
        : randomUUID();
    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // 全局 API 前缀
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)'],
  });

  // URI 版本控制
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS 配置 - 生产环境必须配置 ALLOWED_ORIGINS
  // 支持通配符子域名，如 https://*.moryflow.com
  const isDev = process.env.NODE_ENV !== 'production';
  const allowedPatterns =
    process.env.ALLOWED_ORIGINS?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) ?? [];

  if (!isDev && allowedPatterns.length === 0) {
    throw new Error(
      'ALLOWED_ORIGINS environment variable must be set in production',
    );
  }

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // 开发环境且未配置允许列表：允许所有来源
      if (isDev && allowedPatterns.length === 0) {
        callback(null, true);
        return;
      }

      // 移动端/桌面端无 Origin，允许通过；鉴权在 /api/v1/auth/refresh 中使用 X-App-Platform 校验
      if (!origin) {
        callback(null, true);
        return;
      }

      // 检查是否匹配任一允许的模式（支持通配符）
      const isAllowed = allowedPatterns.some((pattern) =>
        matchOrigin(origin, pattern),
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS: Origin not allowed: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // 设置 OpenAPI 文档
  setupOpenAPI(app, isDev);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`📊 Health check: http://localhost:${port}/health`);
  logger.log(
    `📚 API Reference: http://localhost:${port}${SCALAR_CONFIG.PUBLIC_DOCS_PATH}`,
  );
  if (isDev) {
    logger.log(
      `📚 Internal API Reference: http://localhost:${port}${SCALAR_CONFIG.INTERNAL_DOCS_PATH}`,
    );
  }
}

/**
 * 设置 OpenAPI 文档（Scalar UI）
 */
function setupOpenAPI(app: INestApplication, isDev: boolean) {
  const openApiService = app.get(OpenApiService);

  // === 公开 API 文档 ===
  const publicConfig = openApiService.buildPublicConfig();
  const publicDoc = SwaggerModule.createDocument(app, publicConfig, {
    include: PUBLIC_API_MODULES,
  });

  // 提供 OpenAPI JSON
  app.use(SCALAR_CONFIG.OPENAPI_JSON_PATH, (_: Request, res: Response) =>
    res.json(publicDoc),
  );
  // 提供 Scalar UI
  app.use(
    SCALAR_CONFIG.PUBLIC_DOCS_PATH,
    createScalarMiddleware(SCALAR_CONFIG.OPENAPI_JSON_PATH),
  );

  // === 内部 API 文档（仅开发环境）===
  if (isDev) {
    const internalConfig = openApiService.buildInternalConfig();
    const internalDoc = SwaggerModule.createDocument(app, internalConfig, {
      include: INTERNAL_API_MODULES,
    });

    app.use(
      SCALAR_CONFIG.INTERNAL_OPENAPI_JSON_PATH,
      (_: Request, res: Response) => res.json(internalDoc),
    );
    app.use(
      SCALAR_CONFIG.INTERNAL_DOCS_PATH,
      createScalarMiddleware(SCALAR_CONFIG.INTERNAL_OPENAPI_JSON_PATH),
    );
  }
}

void bootstrap();
