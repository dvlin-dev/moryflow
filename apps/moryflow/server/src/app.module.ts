import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { json, urlencoded, type Request, type Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';
import { AuthModule } from './auth';
import { CreditModule } from './credit';
import { UserModule } from './user';
import { PaymentModule } from './payment';
import { AdminModule } from './admin';
import { AiProxyModule } from './ai-proxy';
import { AiImageModule } from './ai-image';
import { AiAdminModule } from './ai-admin';
import { AdminPaymentModule } from './admin-payment';
import { AdminStorageModule } from './admin-storage';
import { HealthModule } from './health';
import { VaultModule } from './vault';
import { SyncModule } from './sync';
import { QuotaModule } from './quota';
import { SearchModule } from './search';
import { MemoryModule } from './memory';
import { MemoxModule } from './memox';
import { WorkspaceModule } from './workspace';
import { WorkspaceContentModule } from './workspace-content';
import { StorageModule } from './storage';
import { SpeechModule } from './speech';
import { EmailModule } from './email';
import { ActivityLogModule } from './activity-log';
import { SiteModule } from './site';
import { AgentTraceModule } from './agent-trace';
import { AlertModule } from './alert';
import { OpenApiModule } from './openapi';
import { RedemptionModule } from './redemption/redemption.module';
import {
  GLOBAL_THROTTLE_CONFIG,
  RedisThrottlerStorageService,
  ThrottleModule,
  UserThrottlerGuard,
  type GlobalThrottleConfig,
  shouldSkipGlobalThrottle,
} from './common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    ThrottleModule,
    ThrottlerModule.forRootAsync({
      imports: [ThrottleModule],
      inject: [GLOBAL_THROTTLE_CONFIG, RedisThrottlerStorageService],
      useFactory: (
        config: GlobalThrottleConfig,
        storage: RedisThrottlerStorageService,
      ) => {
        return {
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
        };
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    CreditModule,
    UserModule,
    PaymentModule,
    AdminModule,
    AiProxyModule,
    AiImageModule,
    AiAdminModule,
    AdminPaymentModule,
    AdminStorageModule,
    HealthModule,
    VaultModule,
    SyncModule,
    QuotaModule,
    SearchModule,
    MemoryModule,
    MemoxModule,
    WorkspaceModule,
    WorkspaceContentModule,
    StorageModule,
    SpeechModule,
    EmailModule,
    ActivityLogModule,
    SiteModule,
    AgentTraceModule,
    AlertModule,
    OpenApiModule,
    RedemptionModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
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
