/**
 * [INPUT]: 环境变量（PORT/ALLOWED_ORIGINS/...）与反代请求头（X-Forwarded-Proto/Host）
 * [OUTPUT]: 启动 NestJS HTTP 服务并挂载全局中间件/拦截器/Swagger
 * [POS]: Anyhunt Dev Server 入口（反代部署必须启用 trust proxy）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/server/CLAUDE.md`
 */

import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded, type Application } from 'express';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { PrismaService } from './prisma';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

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

async function ensureBootstrapAdmin(prisma: PrismaService, logger: Logger) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logger.warn('ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping admin bootstrap');
    return;
  }

  if (adminPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, isAdmin: true },
  });

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        emailVerified: true,
        isAdmin: true,
      },
      select: { id: true, isAdmin: true },
    }));

  if (!user.isAdmin) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true, emailVerified: true },
    });
  }

  const existingAccount = await prisma.account.findUnique({
    where: {
      providerId_accountId: { providerId: 'credential', accountId: adminEmail },
    },
    select: { id: true, userId: true, password: true },
  });

  if (existingAccount && existingAccount.userId !== user.id) {
    throw new Error(
      `ADMIN_EMAIL ${adminEmail} is already linked to another user`,
    );
  }

  if (!existingAccount) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: adminEmail,
        providerId: 'credential',
        password: passwordHash,
      },
    });
  } else if (!existingAccount.password) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: passwordHash },
    });
  }

  logger.log(`✅ Admin bootstrap ready: ${adminEmail}`);
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
  // 单层反代（megaboxpro/1panel）默认设置为 1；如未来有多层代理再按 hop 数调整。
  (app.getHttpAdapter().getInstance() as Application).set('trust proxy', 1);

  // 增加请求体大小限制（默认 100kb，增加到 50mb）
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // 全局 API 前缀
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'webhooks/(.*)'],
  });

  // URI 版本控制
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 全局响应拦截器
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

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

      // TODO: 安全性改进 - 当前允许所有无 Origin 的请求（移动端需要）
      // 未来可以考虑：
      // 1. 使用 User-Agent 检测移动端
      // 2. 要求移动端使用自定义 Header（如 X-App-Platform: mobile）
      // 3. 使用 API Key 或其他认证机制替代 CORS
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

  // Swagger API 文档配置
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Anyhunt API')
    .setDescription('Anyhunt 截图服务 API 文档')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'APIKey' },
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
    .addTag('Admin', '管理员功能')
    .addTag('Payment', '支付相关')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  await ensureBootstrapAdmin(app.get(PrismaService), logger);
  await ensureDemoPlaygroundUser(app.get(PrismaService), logger);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`📊 Health check: http://localhost:${port}/health`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/api-docs`);
}

void bootstrap();
