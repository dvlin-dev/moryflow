/**
 * [PROVIDES]: AppModule - 根模块
 * [DEPENDS]: AuthModule, UsersModule, SubscriptionsModule, OrdersModule, CreditsModule, StatsModule, LogsModule
 * [POS]: 统一管理后台根模块
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { OrdersModule } from './orders/orders.module';
import { CreditsModule } from './credits/credits.module';
import { StatsModule } from './stats/stats.module';
import { LogsModule } from './logs/logs.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    OrdersModule,
    CreditsModule,
    StatsModule,
    LogsModule,
  ],
})
export class AppModule {}
