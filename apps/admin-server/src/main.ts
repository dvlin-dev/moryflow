/**
 * [INPUT]: 环境变量
 * [OUTPUT]: 运行中的 NestJS 服务
 * [POS]: 统一管理后台服务入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 解析 cookie
  app.use(cookieParser());

  // 设置 API 前缀
  app.setGlobalPrefix('api');

  // 启用版本控制
  app.enableVersioning();

  // CORS 配置（允许 admin.aiget.dev 和本地开发）
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3001', 'https://admin.aiget.dev'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`Admin Server is running on port ${port}`);
}

bootstrap();
