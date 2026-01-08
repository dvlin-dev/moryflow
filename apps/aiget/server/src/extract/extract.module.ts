// apps/server/src/extract/extract.module.ts
import { Module } from '@nestjs/common';
import { ScraperModule } from '../scraper';
import { ApiKeyModule } from '../api-key';
import { BillingModule } from '../billing/billing.module';

import { ExtractService } from './extract.service';
import { ExtractController } from './extract.controller';
import { LlmClient } from './llm.client';

@Module({
  imports: [ScraperModule, ApiKeyModule, BillingModule],
  controllers: [ExtractController],
  providers: [ExtractService, LlmClient],
  exports: [ExtractService, LlmClient],
})
export class ExtractModule {}
