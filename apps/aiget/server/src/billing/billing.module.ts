/**
 * [POS]: Billing Module
 *
 * 职责：提供 BillingService（扣费/退费），不直接耦合具体业务模块
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及 apps/aiget/server/CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [QuotaModule],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
