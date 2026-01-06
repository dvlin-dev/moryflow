/**
 * [INPUT]: All feature modules, ConfigModule
 * [OUTPUT]: Root NestJS module with global providers
 * [POS]: Root module - registers all 25 feature modules, global pipes, interceptors
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/CLAUDE.md
 */

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { json, urlencoded, type Request, type Response } from 'express';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';
import { QueueModule } from './queue';
import { EmailModule } from './email';
import { AuthModule } from './auth';
import { UserModule } from './user';
import { PaymentModule } from './payment';
import { HealthModule } from './health';
import { ApiKeyModule } from './api-key';
import { SubscriptionModule } from './subscription';
import { QuotaModule } from './quota';
import { UsageModule } from './usage';
import { WebhookModule } from './webhook';
import { AdminModule } from './admin';
// Memory Core Modules
import { EmbeddingModule } from './embedding';
import { LlmModule } from './llm';
import { MemoryModule } from './memory';
import { EntityModule } from './entity';
import { RelationModule } from './relation';
import { GraphModule } from './graph';
import { ExtractModule } from './extract';
// OpenAPI
import { OpenApiModule } from './openapi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    QueueModule,
    EmailModule,
    AuthModule,
    UserModule,
    PaymentModule,
    HealthModule,
    ApiKeyModule,
    SubscriptionModule,
    QuotaModule,
    UsageModule,
    WebhookModule,
    AdminModule,
    // Memory Core Modules
    EmbeddingModule,
    LlmModule,
    MemoryModule,
    EntityModule,
    RelationModule,
    GraphModule,
    ExtractModule,
    // OpenAPI
    OpenApiModule,
  ],
  providers: [
    // Global Zod validation pipe
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    // Global Zod serializer interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 保留原始 body 以支持 Better Auth 与 Webhook 验签
    const captureRawBody = (
      req: Request & { rawBody?: Buffer },
      _res: Response,
      buf: Buffer,
    ) => {
      if (buf?.length) {
        req.rawBody = Buffer.from(buf);
      }
    };

    consumer
      .apply(
        json({ verify: captureRawBody, limit: '50mb' }),
        urlencoded({ extended: true, verify: captureRawBody, limit: '50mb' }),
      )
      .forRoutes('*');
  }
}
