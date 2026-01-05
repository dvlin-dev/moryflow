import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
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

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // 保留原始请求体用于 Webhook 签名验证
    rawBody: true,
  });

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
    .setTitle('Aiget API')
    .setDescription('Aiget 截图服务 API 文档')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .addCookieAuth('better-auth.session_token', {
      type: 'apiKey',
      in: 'cookie',
    })
    .addTag('Health', '健康检查')
    .addTag('Admin', '管理员功能')
    .addTag('Payment', '支付相关')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`📊 Health check: http://localhost:${port}/health`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/api-docs`);
}

void bootstrap();
