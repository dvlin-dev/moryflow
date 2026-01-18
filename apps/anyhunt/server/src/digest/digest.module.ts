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
  DigestAiService,
  DigestPreviewService,
  DigestAdminService,
  DigestReportService,
  DigestRateLimitService,
  DigestRssService,
  DigestSiteCrawlService,
  DigestSourceService,
  DigestFeedbackService,
  DigestNotificationService,
  DigestWelcomeConfigService,
  DigestWelcomePagesService,
} from './services';

// Processors
import {
  SubscriptionSchedulerProcessor,
  SubscriptionRunProcessor,
  SourceSchedulerProcessor,
  SourceRefreshProcessor,
  WebhookDeliveryProcessor,
  EmailDeliveryProcessor,
} from './processors';

// Controllers
import {
  DigestConsoleSubscriptionController,
  DigestConsoleInboxController,
  DigestConsoleRunController,
  DigestConsoleTopicController,
  DigestPublicTopicController,
  DigestPublicWelcomeController,
  DigestPublicWelcomePagesController,
  DigestAdminController,
  DigestAdminWelcomeController,
  DigestAdminWelcomePagesController,
} from './controllers';

// Queue constants
import {
  DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE,
  DIGEST_SUBSCRIPTION_RUN_QUEUE,
  DIGEST_TOPIC_SCHEDULER_QUEUE,
  DIGEST_TOPIC_EDITION_QUEUE,
  DIGEST_CONTENT_INGEST_QUEUE,
  DIGEST_SOURCE_REFRESH_QUEUE,
  DIGEST_SOURCE_SCHEDULER_QUEUE,
  DIGEST_WEBHOOK_DELIVERY_QUEUE,
  DIGEST_EMAIL_DELIVERY_QUEUE,
} from '../queue/queue.constants';

// Dependencies
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SearchModule } from '../search/search.module';
import { ScraperModule } from '../scraper/scraper.module';
import { BillingModule } from '../billing/billing.module';
import { ExtractModule } from '../extract/extract.module';
import { MapModule } from '../map/map.module';

@Module({
  imports: [
    // 依赖模块
    PrismaModule,
    RedisModule,
    SearchModule,
    ScraperModule,
    BillingModule,
    ExtractModule, // 提供 LlmClient
    MapModule, // 提供 MapService

    // BullMQ 队列
    BullModule.registerQueue(
      { name: DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE },
      { name: DIGEST_SUBSCRIPTION_RUN_QUEUE },
      { name: DIGEST_TOPIC_SCHEDULER_QUEUE },
      { name: DIGEST_TOPIC_EDITION_QUEUE },
      { name: DIGEST_CONTENT_INGEST_QUEUE },
      { name: DIGEST_SOURCE_REFRESH_QUEUE },
      { name: DIGEST_SOURCE_SCHEDULER_QUEUE },
      { name: DIGEST_WEBHOOK_DELIVERY_QUEUE },
      { name: DIGEST_EMAIL_DELIVERY_QUEUE },
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
    DigestPublicWelcomeController,
    DigestPublicWelcomePagesController,

    // Admin 控制器
    DigestAdminController,
    DigestAdminWelcomeController,
    DigestAdminWelcomePagesController,
  ],
  providers: [
    // Services
    DigestSubscriptionService,
    DigestContentService,
    DigestRunService,
    DigestInboxService,
    DigestTopicService,
    DigestAiService,
    DigestPreviewService,
    DigestAdminService,
    DigestReportService,
    DigestRateLimitService,
    DigestRssService,
    DigestSiteCrawlService,
    DigestSourceService,
    DigestFeedbackService,
    DigestNotificationService,
    DigestWelcomeConfigService,
    DigestWelcomePagesService,

    // Processors
    SubscriptionSchedulerProcessor,
    SubscriptionRunProcessor,
    SourceSchedulerProcessor,
    SourceRefreshProcessor,
    WebhookDeliveryProcessor,
    EmailDeliveryProcessor,
  ],
  exports: [
    // 导出服务供其他模块使用
    DigestSubscriptionService,
    DigestContentService,
    DigestRunService,
    DigestInboxService,
    DigestTopicService,
    DigestAiService,
    DigestPreviewService,
    DigestFeedbackService,
  ],
})
export class DigestModule {}
