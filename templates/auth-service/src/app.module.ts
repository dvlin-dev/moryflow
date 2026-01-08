/**
 * [PROVIDES]: AppModule - Auth Service 应用模块
 * [DEPENDS]: AuthModule, PrismaModule, HealthController
 * [POS]: Auth Service 组合入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 templates/auth-service/README.md
 */

import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
