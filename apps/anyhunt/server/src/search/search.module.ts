// apps/server/src/search/search.module.ts
import { Module } from '@nestjs/common';
import { ScraperModule } from '../scraper';
import { ApiKeyModule } from '../api-key';
import { BillingModule } from '../billing/billing.module';

import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ScraperModule, ApiKeyModule, BillingModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
