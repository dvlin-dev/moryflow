import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { json, urlencoded, type Request, type Response } from 'express';
import { PrismaModule } from './prisma';
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
import { EntityModule } from './entity';
import { RelationModule } from './relation';
import { GraphModule } from './graph';
import { CommonModule } from './common';
import { NotFoundModule } from './not-found';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    QueueModule,
    CommonModule,
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
    EntityModule,
    RelationModule,
    GraphModule,
    // NotFoundModule must be LAST to catch all unmatched routes
    NotFoundModule,
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
