/**
 * Admin Module
 * 管理后台模块
 */

import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { AdminOrdersController } from './admin-orders.controller';

@Module({
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminUsersController,
    AdminSubscriptionsController,
    AdminOrdersController,
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
