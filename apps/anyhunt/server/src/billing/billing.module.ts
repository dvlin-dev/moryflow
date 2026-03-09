/**
 * [POS]: Billing Module
 *
 * 职责：提供 BillingService（扣费/退费），不直接耦合具体业务模块
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
