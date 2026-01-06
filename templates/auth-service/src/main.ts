/**
 * [INPUT]: 环境变量, AppModule
 * [OUTPUT]: 运行中的 Auth Service
 * [POS]: Auth Service 启动入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 templates/auth-service/README.md
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

function parseOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const logger = new Logger('AuthService');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true }));

  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = parseOrigins(process.env.TRUSTED_ORIGINS);

  if (isProduction && allowedOrigins.length === 0) {
    throw new Error('TRUSTED_ORIGINS must be set in production');
  }

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  logger.log(`Auth service listening on port ${port}`);
}

bootstrap();
