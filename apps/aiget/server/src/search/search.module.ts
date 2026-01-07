// apps/server/src/search/search.module.ts
import { Module } from '@nestjs/common';
import { ScraperModule } from '../scraper';
import { ApiKeyModule } from '../api-key';

import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ScraperModule, ApiKeyModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
