/**
 * [DEFINES]: 配额模块
 * [USED_BY]: app.module.ts
 * [POS]: 配额模块入口，注册服务和控制器
 */

import { Module, forwardRef } from '@nestjs/common';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';
import { QuotaGuard } from './quota.guard';
import { PrismaModule } from '../prisma';
import { SubscriptionModule } from '../subscription';
import { UsageModule } from '../usage';
import { AuthModule } from '../auth';

@Module({
  imports: [
    PrismaModule,
    SubscriptionModule,
    AuthModule,
    forwardRef(() => UsageModule),
  ],
  controllers: [QuotaController],
  providers: [QuotaService, QuotaGuard],
  exports: [QuotaService, QuotaGuard, UsageModule],
})
export class QuotaModule {}
