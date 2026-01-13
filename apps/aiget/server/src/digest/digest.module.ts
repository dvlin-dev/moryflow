/**
 * Digest Module
 *
 * [PROVIDES]: 智能内容订阅系统 v2.0
 * [POS]: NestJS 模块定义，整合服务、处理器、控制器
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

// Services
import {
  DigestSubscriptionService,
  DigestContentService,
  DigestRunService,
  DigestInboxService,
  DigestTopicService,
} from './services';

// Processors
import {
  SubscriptionSchedulerProcessor,
  SubscriptionRunProcessor,
} from './processors';

// Controllers
import {
  DigestConsoleSubscriptionController,
  DigestConsoleInboxController,
  DigestConsoleRunController,
  DigestConsoleTopicController,
  DigestPublicTopicController,
  DigestAdminController,
} from './controllers';

// Queue constants
import {
  DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE,
  DIGEST_SUBSCRIPTION_RUN_QUEUE,
  DIGEST_TOPIC_SCHEDULER_QUEUE,
  DIGEST_TOPIC_EDITION_QUEUE,
  DIGEST_CONTENT_INGEST_QUEUE,
  DIGEST_SOURCE_REFRESH_QUEUE,
} from '../queue/queue.constants';

// Dependencies
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SearchModule } from '../search/search.module';
import { ScraperModule } from '../scraper/scraper.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    // 依赖模块
    PrismaModule,
    RedisModule,
    SearchModule,
    ScraperModule,
    BillingModule,

    // BullMQ 队列
    BullModule.registerQueue(
      { name: DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE },
      { name: DIGEST_SUBSCRIPTION_RUN_QUEUE },
      { name: DIGEST_TOPIC_SCHEDULER_QUEUE },
      { name: DIGEST_TOPIC_EDITION_QUEUE },
      { name: DIGEST_CONTENT_INGEST_QUEUE },
      { name: DIGEST_SOURCE_REFRESH_QUEUE },
    ),
  ],
  controllers: [
    // Console 控制器（Session 认证）
    DigestConsoleSubscriptionController,
    DigestConsoleInboxController,
    DigestConsoleRunController,
    DigestConsoleTopicController,

    // Public 控制器（部分需要认证）
    DigestPublicTopicController,

    // Admin 控制器
    DigestAdminController,
  ],
  providers: [
    // Services
    DigestSubscriptionService,
    DigestContentService,
    DigestRunService,
    DigestInboxService,
    DigestTopicService,

    // Processors
    SubscriptionSchedulerProcessor,
    SubscriptionRunProcessor,
  ],
  exports: [
    // 导出服务供其他模块使用
    DigestSubscriptionService,
    DigestContentService,
    DigestRunService,
    DigestInboxService,
    DigestTopicService,
  ],
})
export class DigestModule {}
