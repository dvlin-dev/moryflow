/**
 * Admin Module
 * 管理后台模块
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminService } from './admin.service';
import { AdminJobsService } from './admin-jobs.service';
import { AdminQueueService } from './admin-queue.service';
import { AdminScheduledTasksService } from './admin-scheduled-tasks.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUserCreditsController } from './admin-user-credits.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminQueueController } from './admin-queue.controller';
import { AdminBrowserController } from './admin-browser.controller';
import { QueueModule } from '../queue';
import { AdminUserCreditsService } from './admin-user-credits.service';
import {
  DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE,
  DIGEST_SUBSCRIPTION_RUN_QUEUE,
  DIGEST_SOURCE_SCHEDULER_QUEUE,
  DIGEST_SOURCE_REFRESH_QUEUE,
  DIGEST_WEBHOOK_DELIVERY_QUEUE,
  DIGEST_EMAIL_DELIVERY_QUEUE,
} from '../queue/queue.constants';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue(
      { name: DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE },
      { name: DIGEST_SUBSCRIPTION_RUN_QUEUE },
      { name: DIGEST_SOURCE_SCHEDULER_QUEUE },
      { name: DIGEST_SOURCE_REFRESH_QUEUE },
      { name: DIGEST_WEBHOOK_DELIVERY_QUEUE },
      { name: DIGEST_EMAIL_DELIVERY_QUEUE },
    ),
  ],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminUserCreditsController,
    AdminSubscriptionsController,
    AdminOrdersController,
    AdminJobsController,
    AdminQueueController,
    AdminBrowserController,
  ],
  providers: [
    AdminService,
    AdminJobsService,
    AdminQueueService,
    AdminScheduledTasksService,
    AdminUserCreditsService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
