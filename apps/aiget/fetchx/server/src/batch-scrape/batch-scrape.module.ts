// apps/server/src/batch-scrape/batch-scrape.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BATCH_SCRAPE_QUEUE } from '../queue/queue.constants';
import { ScraperModule } from '../scraper';
import { ApiKeyModule } from '../api-key';

import { BatchScrapeService } from './batch-scrape.service';
import { BatchScrapeProcessor } from './batch-scrape.processor';
import { BatchScrapeController } from './batch-scrape.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BATCH_SCRAPE_QUEUE,
    }),
    ScraperModule,
    ApiKeyModule,
  ],
  controllers: [BatchScrapeController],
  providers: [BatchScrapeService, BatchScrapeProcessor],
  exports: [BatchScrapeService],
})
export class BatchScrapeModule {}
