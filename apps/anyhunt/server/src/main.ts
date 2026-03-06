/**
 * [INPUT]: 环境变量（PORT/TRUST_PROXY/ALLOWED_ORIGINS/...）与反代请求头（X-Forwarded-Proto/Host）
 * [OUTPUT]: 启动 NestJS HTTP 服务并挂载全局中间件/拦截器/OpenAPI（Scalar）
 * [POS]: Anyhunt Dev Server 入口（反代部署必须启用 trust proxy）
 * [NOTE]: 启动期仅初始化 Demo 用户，管理员权限由注册后 ADMIN_EMAILS 白名单授予
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/server/CLAUDE.md`
 */

import { NestFactory } from '@nestjs/core';
import {
  HttpStatus,
  Logger,
  VersioningType,
  type INestApplication,
} from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import {
  json,
  urlencoded,
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';
import { PrismaService } from './prisma';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { buildProblemDetails, getRequestId, matchOrigin } from './common/utils';
import { DEVICE_PLATFORM_ALLOWLIST } from './auth/auth.constants';
import { getTrustedOrigins } from './auth/auth.config';
import {
  OpenApiService,
  SCALAR_CONFIG,
  createScalarMiddleware,
  isOpenApiRoutePath,
} from './openapi';
import {
  INTERNAL_API_MODULES,
  PUBLIC_API_MODULES,
} from './openapi/openapi-modules';

function resolveTrustProxyConfig(logger: Logger): boolean | number {
  const raw = process.env.TRUST_PROXY;
  if (!raw || raw.trim().length === 0) {
    return 1;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  const hops = Number.parseInt(raw, 10);
  if (Number.isInteger(hops) && hops >= 0) {
    return hops;
  }

  logger.warn(`Invalid TRUST_PROXY="${raw}", fallback to 1 (single proxy hop)`);
  return 1;
}

async function ensureDemoPlaygroundUser(prisma: PrismaService, logger: Logger) {
  const demoUserId = 'demo-playground-user';
  const demoEmail = 'demo@anyhunt.app';

  const existingByEmail = await prisma.user.findUnique({
    where: { email: demoEmail },
    select: { id: true },
  });

  if (existingByEmail && existingByEmail.id !== demoUserId) {
    throw new Error(
      `Demo user email ${demoEmail} is already used by another user (${existingByEmail.id})`,
    );
  }

  await prisma.user.upsert({
    where: { id: demoUserId },
    update: { email: demoEmail, name: 'Demo Playground', emailVerified: true },
    create: {
      id: demoUserId,
      email: demoEmail,
      name: 'Demo Playground',
      emailVerified: true,
      isAdmin: false,
    },
  });

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { userId: demoUserId },
    update: {
      tier: 'FREE',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDaysLater,
      cancelAtPeriodEnd: false,
    },
    create: {
      userId: demoUserId,
      tier: 'FREE',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDaysLater,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.quota.upsert({
    where: { userId: demoUserId },
    update: {
      monthlyLimit: 999999,
      monthlyUsed: 0,
      periodStartAt: now,
      periodEndAt: thirtyDaysLater,
      purchasedQuota: 0,
    },
    create: {
      userId: demoUserId,
      monthlyLimit: 999999,
      monthlyUsed: 0,
      periodStartAt: now,
      periodEndAt: thirtyDaysLater,
      purchasedQuota: 0,
    },
  });

  logger.log(`✅ Demo playground user ready: ${demoUserId}`);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // 保留原始请求体用于 Webhook 签名验证
    rawBody: true,
  });

  // 反代部署必须启用 trust proxy，否则 req.protocol/secure cookie 等会被错误识别为 http。
  // 默认值 1（单层反代）；多层反代可通过 TRUST_PROXY=true 或具体 hop 数调整。
  const trustProxy = resolveTrustProxyConfig(logger);
  (app.getHttpAdapter().getInstance() as Application).set(
    'trust proxy',
    trustProxy,
  );
  logger.log(`Express trust proxy set to: ${String(trustProxy)}`);

  // 增加请求体大小限制（默认 100kb，增加到 50mb）
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // 请求 ID（用于 RFC7807 错误体与链路排查）
  app.use((req: Request, res: Response, next: NextFunction) => {
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
  const allowedPatterns = getTrustedOrigins();

  if (!isDev && allowedPatterns.length === 0) {
    throw new Error(
      'TRUSTED_ORIGINS environment variable must be set in production',
    );
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isOpenApiRoutePath(req.path)) {
      next();
      return;
    }

    const origin = req.headers.origin;
    if (!origin && req.headers.cookie) {
      const platformHeader = req.headers['x-app-platform'];
      const platform = Array.isArray(platformHeader)
        ? platformHeader[0]
        : platformHeader;
      const normalized =
        typeof platform === 'string' ? platform.toLowerCase() : '';
      if (!DEVICE_PLATFORM_ALLOWLIST.has(normalized)) {
        const problem = buildProblemDetails({
          status: HttpStatus.FORBIDDEN,
          code: 'FORBIDDEN',
          message: 'Missing origin',
          requestId: getRequestId(req),
        });
        res
          .status(HttpStatus.FORBIDDEN)
          .type('application/problem+json')
          .json(problem);
        return;
      }
    }
    next();
  });

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

  // 设置 OpenAPI 文档（Scalar UI）
  setupOpenAPI(app);

  await ensureDemoPlaygroundUser(app.get(PrismaService), logger);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`📊 Health check: http://localhost:${port}/health`);
  logger.log(
    `📚 API Reference: http://localhost:${port}${SCALAR_CONFIG.PUBLIC_DOCS_PATH}`,
  );
  logger.log(
    `📚 Internal API Reference: http://localhost:${port}${SCALAR_CONFIG.INTERNAL_DOCS_PATH}`,
  );
}

function setupOpenAPI(app: INestApplication) {
  const openApiService = app.get(OpenApiService);

  // === 公开 API 文档 ===
  const publicConfig = openApiService.buildPublicConfig();
  const publicDoc = SwaggerModule.createDocument(app, publicConfig, {
    include: PUBLIC_API_MODULES,
  });

  app.use(SCALAR_CONFIG.OPENAPI_JSON_PATH, (_: Request, res: Response) =>
    res.json(publicDoc),
  );
  app.use(
    SCALAR_CONFIG.PUBLIC_DOCS_PATH,
    createScalarMiddleware(SCALAR_CONFIG.OPENAPI_JSON_PATH),
  );

  // === 内部 API 文档 ===
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

void bootstrap();
