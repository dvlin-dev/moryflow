/**
 * [INPUT]: Environment variables, AppModule
 * [OUTPUT]: Running NestJS application with OpenAPI docs
 * [POS]: Application bootstrap - configures CORS, versioning, OpenAPI, global interceptors/filters
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/CLAUDE.md
 */

import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, VersioningType, type INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  OpenApiService,
  SCALAR_CONFIG,
  createScalarMiddleware,
} from './openapi';
import { MemoryModule } from './memory/memory.module';
import { EntityModule } from './entity/entity.module';
import { RelationModule } from './relation/relation.module';
import { GraphModule } from './graph/graph.module';
import { ExtractModule } from './extract/extract.module';

/**
 * 检查 origin 是否匹配模式
 * 支持通配符子域名，如 https://*.memai.dev
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

  // 增加请求体大小限制（默认 100kb，增加到 50mb）
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // CORS 配置 - 生产环境必须配置 ALLOWED_ORIGINS
  // 支持通配符子域名，如 https://*.memai.dev
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

      // 允许无 Origin 的请求（移动端、Postman、服务器间调用等）
      // 这些请求通过 API Key 认证，不依赖 CORS 保护
      // 注意：浏览器请求总会携带 Origin，所以这不会绕过 CORS 检查
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

  // 全局 API 前缀配置
  // 排除 health 和 webhooks 路由，它们不需要 /api 前缀
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'webhooks/(.*)'],
  });

  // URI 版本控制
  // Public API 使用 v1 版本，Console/Admin API 使用 VERSION_NEUTRAL
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 全局响应拦截器 - 统一响应格式
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  // 全局异常过滤器 - 统一错误格式
  app.useGlobalFilters(new HttpExceptionFilter());

  // OpenAPI + Scalar API Reference
  setupOpenApi(app, logger);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Application running on port ${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
  logger.log(`API Reference: http://localhost:${port}${SCALAR_CONFIG.REFERENCE_PATH}`);
}

/**
 * Setup OpenAPI documentation with Scalar UI
 * - Public docs: /api-reference (all environments)
 * - Internal docs: /api-reference/internal (dev only)
 * Error boundary: failures don't prevent app startup
 */
function setupOpenApi(app: INestApplication, logger: Logger): void {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    const openApiService = app.get(OpenApiService);

    // Public API docs (v1 endpoints only)
    const publicConfig = openApiService.buildPublicConfig();
    const publicDoc = SwaggerModule.createDocument(app, publicConfig, {
      include: [
        MemoryModule,
        EntityModule,
        RelationModule,
        GraphModule,
        ExtractModule,
      ],
    });
    const cleanedPublicDoc = cleanupOpenApiDoc(publicDoc);

    app.use(
      SCALAR_CONFIG.OPENAPI_JSON_PATH,
      (_req: unknown, res: { json: (doc: unknown) => void }) => {
        res.json(cleanedPublicDoc);
      },
    );

    app.use(
      SCALAR_CONFIG.REFERENCE_PATH,
      createScalarMiddleware({
        openApiJsonUrl: SCALAR_CONFIG.OPENAPI_JSON_PATH,
        proxyUrl: process.env.SCALAR_PROXY_URL,
      }),
    );

    logger.log(`API Reference available at ${SCALAR_CONFIG.REFERENCE_PATH}`);

    // Internal API docs (dev only)
    if (isDev) {
      const internalConfig = openApiService.buildInternalConfig();
      const internalDoc = SwaggerModule.createDocument(app, internalConfig);
      const cleanedInternalDoc = cleanupOpenApiDoc(internalDoc);

      app.use(
        SCALAR_CONFIG.INTERNAL_OPENAPI_JSON_PATH,
        (_req: unknown, res: { json: (doc: unknown) => void }) => {
          res.json(cleanedInternalDoc);
        },
      );

      app.use(
        SCALAR_CONFIG.INTERNAL_REFERENCE_PATH,
        createScalarMiddleware({
          openApiJsonUrl: SCALAR_CONFIG.INTERNAL_OPENAPI_JSON_PATH,
          proxyUrl: process.env.SCALAR_PROXY_URL,
        }),
      );

      logger.log(
        `Internal API Reference available at ${SCALAR_CONFIG.INTERNAL_REFERENCE_PATH}`,
      );
    }
  } catch (error) {
    // Error boundary: don't prevent app startup
    logger.error('OpenAPI setup failed:', error);
  }
}

void bootstrap();
