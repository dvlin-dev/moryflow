// apps/server/src/extract/extract.module.ts
import { Module } from '@nestjs/common';
import { ScraperModule } from '../scraper';
import { ApiKeyModule } from '../api-key';
import { BillingModule } from '../billing/billing.module';
import { LlmModule } from '../llm/llm.module';

import { ExtractService } from './extract.service';
import { ExtractController } from './extract.controller';
import { ExtractLlmClient } from './extract-llm.client';

@Module({
  imports: [ScraperModule, ApiKeyModule, BillingModule, LlmModule],
  controllers: [ExtractController],
  providers: [ExtractService, ExtractLlmClient],
  exports: [ExtractService],
})
export class ExtractModule {}
