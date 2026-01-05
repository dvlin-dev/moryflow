/**
 * Admin Module
 * 管理后台模块
 */

import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJobsService } from './admin-jobs.service';
import { AdminQueueService } from './admin-queue.service';
import { AdminScheduledTasksService } from './admin-scheduled-tasks.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminQueueController } from './admin-queue.controller';
import { AdminBrowserController } from './admin-browser.controller';
import { QueueModule } from '../queue';

@Module({
  imports: [QueueModule],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminUsersController,
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
  ],
  exports: [AdminService],
})
export class AdminModule {}
