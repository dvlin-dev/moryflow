import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { json, urlencoded, type Request, type Response } from 'express';
import { PrismaModule } from './prisma';
import { IdempotencyModule } from './idempotency';
import { VectorPrismaModule } from './vector-prisma';
import { RedisModule } from './redis';
import { QueueModule } from './queue';
import { EmailModule } from './email';
import { AuthModule } from './auth';
import { UserModule } from './user';
import { PaymentModule } from './payment';
import { StorageModule } from './storage';
import { HealthModule } from './health';
import { ApiKeyModule } from './api-key';
import { QuotaModule } from './quota';
import { BrowserModule } from './browser';
import { ScraperModule } from './scraper';
import { CrawlerModule } from './crawler';
import { MapModule } from './map';
import { BatchScrapeModule } from './batch-scrape';
import { ExtractModule } from './extract';
import { SearchModule } from './search';
import { WebhookModule } from './webhook';
import { AdminModule } from './admin';
import { OembedModule } from './oembed';
import { DemoModule } from './demo/demo.module';
import { EmbeddingModule } from './embedding';
import { MemoryModule } from './memory';
import { RetrievalModule } from './retrieval';
import { SourcesModule } from './sources';
import { GraphModule } from './graph';
import { CommonModule } from './common';
import {
  GLOBAL_THROTTLE_CONFIG,
  RedisThrottlerStorageService,
  ThrottleModule,
  UserThrottlerGuard,
  type GlobalThrottleConfig,
  shouldSkipGlobalThrottle,
} from './common/guards';
import { AgentModule } from './agent';
import { RedemptionModule } from './redemption';
import { DigestModule } from './digest';
import { NotFoundModule } from './not-found';
import { LlmModule } from './llm';
import { OpenApiModule } from './openapi';
import { LogModule, RequestLogMiddleware } from './log';
import { MemoxPlatformModule } from './memox-platform';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottleModule,
    ThrottlerModule.forRootAsync({
      imports: [ThrottleModule],
      inject: [GLOBAL_THROTTLE_CONFIG, RedisThrottlerStorageService],
      useFactory: (
        config: GlobalThrottleConfig,
        storage: RedisThrottlerStorageService,
      ) => ({
        storage,
        skipIf: (context) => {
          const req = context
            .switchToHttp()
            .getRequest<Request & { originalUrl?: string }>();
          const path = req.originalUrl ?? req.url ?? req.path ?? '/';
          return shouldSkipGlobalThrottle(path, config.skipPaths);
        },
        throttlers: [
          {
            ttl: config.ttlMs,
            limit: config.limit,
            blockDuration: config.blockDurationMs,
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    OpenApiModule,
    MemoxPlatformModule,
    PrismaModule,
    IdempotencyModule,
    VectorPrismaModule,
    RedisModule,
    QueueModule,
    CommonModule,
    LogModule,
    EmailModule,
    AuthModule,
    UserModule,
    PaymentModule,
    StorageModule,
    HealthModule,
    ApiKeyModule,
    QuotaModule,
    BrowserModule,
    ScraperModule,
    CrawlerModule,
    MapModule,
    BatchScrapeModule,
    ExtractModule,
    SearchModule,
    WebhookModule,
    AdminModule,
    OembedModule,
    DemoModule,
    EmbeddingModule,
    MemoryModule,
    RetrievalModule,
    SourcesModule,
    GraphModule,
    LlmModule,
    AgentModule,
    DigestModule,
    RedemptionModule,
    // NotFoundModule must be LAST to catch all unmatched routes
    NotFoundModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: UserThrottlerGuard }],
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

    consumer.apply(RequestLogMiddleware).forRoutes('*');
  }
}
