import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_PIPE } from '@nestjs/core';
import { json, urlencoded, type Request, type Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';
import { AuthModule } from './auth';
import { CreditModule } from './credit';
import { UserModule } from './user';
import { PaymentModule } from './payment';
import { AdminModule } from './admin';
import { LicenseModule } from './license';
import { AiProxyModule } from './ai-proxy';
import { AiImageModule } from './ai-image';
import { AiAdminModule } from './ai-admin';
import { AdminPaymentModule } from './admin-payment';
import { AdminStorageModule } from './admin-storage';
import { HealthModule } from './health';
import { VectorizeModule } from './vectorize';
import { VaultModule } from './vault';
import { SyncModule } from './sync';
import { QuotaModule } from './quota';
import { SearchModule } from './search';
import { StorageModule } from './storage';
import { SpeechModule } from './speech';
import { EmailModule } from './email';
import { ActivityLogModule } from './activity-log';
import { SiteModule } from './site';
import { AgentTraceModule } from './agent-trace';
import { AlertModule } from './alert';
import { OpenApiModule } from './openapi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    CreditModule,
    UserModule,
    PaymentModule,
    AdminModule,
    LicenseModule,
    AiProxyModule,
    AiImageModule,
    AiAdminModule,
    AdminPaymentModule,
    AdminStorageModule,
    HealthModule,
    VectorizeModule,
    VaultModule,
    SyncModule,
    QuotaModule,
    SearchModule,
    StorageModule,
    SpeechModule,
    EmailModule,
    ActivityLogModule,
    SiteModule,
    AgentTraceModule,
    AlertModule,
    OpenApiModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 保留原始 body 以支持 Better Auth 与 Webhook 验签，同时确保所有路由都能解析 JSON/Form
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
