/**
 * [INPUT]: 环境变量（PORT/ALLOWED_ORIGINS/...）与反代请求头（X-Forwarded-Proto/Host）
 * [OUTPUT]: 启动 NestJS HTTP 服务并挂载中间件/OpenAPI/各业务模块
 * [POS]: Moryflow Server 入口（反代部署必须启用 trust proxy）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
import { INTERNAL_GLOBAL_PREFIX_EXCLUDES } from './common/http/internal-routes';
import {
  OpenApiService,
  SCALAR_CONFIG,
  createScalarMiddleware,
} from './openapi';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  getAllowedOrigins,
  isOriginAllowed,
} from './common/utils/origin.utils';
import { stripBrowserContextHeadersFromRequest } from './auth/auth-request-context';

// 公开 API 模块
import { HealthModule } from './health';
import { AuthModule } from './auth';
import { PaymentModule } from './payment';
import { AiProxyModule } from './ai-proxy';
import { AiImageModule } from './ai-image';
import { SpeechModule } from './speech';
import { SearchModule } from './search';
import { MemoryModule } from './memory';
import { StorageModule } from './storage';
import { SyncModule } from './sync';
import { SiteModule } from './site';
import { ActivityLogModule } from './activity-log';
import { RedemptionModule } from './redemption/redemption.module';

// 内部 API 模块
import { AdminModule } from './admin';
import { AdminPaymentModule } from './admin-payment';
import { AdminStorageModule } from './admin-storage';
import { AgentTraceModule } from './agent-trace';
import { AiAdminModule } from './ai-admin';
import { AlertModule } from './alert';
import { QuotaModule } from './quota';

// ==========================================
// OpenAPI 模块列表
// ==========================================

/** 公开 API 模块（面向客户端） */
const PUBLIC_API_MODULES = [
  HealthModule,
  AuthModule,
  PaymentModule,
  AiProxyModule,
  AiImageModule,
  SpeechModule,
  SearchModule,
  MemoryModule,
  StorageModule,
  SyncModule,
  SiteModule,
  ActivityLogModule,
  RedemptionModule,
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
  RedemptionModule,
];

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

  // 设备端 token-first auth（desktop/mobile/cli）不应携带浏览器 Origin/Referer。
  // 在 CORS 与 Better Auth 处理前显式移除这类头，避免主进程伪造 Origin
  // 将设备请求错误拖入 browser trusted origin 逻辑。
  app.use((req: Request, _res: Response, next: (err?: unknown) => void) => {
    stripBrowserContextHeadersFromRequest(req);
    next();
  });

  // 全局 API 前缀
  app.setGlobalPrefix('api', {
    exclude: [...INTERNAL_GLOBAL_PREFIX_EXCLUDES],
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
  const hasExplicitAllowedPatterns = Boolean(
    process.env.TRUSTED_ORIGINS?.trim() || process.env.ALLOWED_ORIGINS?.trim(),
  );
  const allowedPatterns = getAllowedOrigins();

  if (!isDev && allowedPatterns.length === 0) {
    throw new Error(
      'TRUSTED_ORIGINS or ALLOWED_ORIGINS environment variable must be set in production',
    );
  }

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // 开发环境且未配置允许列表：允许所有来源
      if (isDev && !hasExplicitAllowedPatterns) {
        callback(null, true);
        return;
      }

      // 移动端/桌面端无 Origin，允许通过；鉴权在 /api/v1/auth/refresh 中使用 X-App-Platform 校验
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isOriginAllowed(origin, allowedPatterns)) {
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
