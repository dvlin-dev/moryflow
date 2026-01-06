// apps/server/src/crawler/crawler.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CRAWL_QUEUE } from '../queue/queue.constants';
import { ScraperModule } from '../scraper';
import { ApiKeyModule } from '../api-key';

import { CrawlerService } from './crawler.service';
import { CrawlerProcessor } from './crawler.processor';
import { CrawlerController } from './crawler.controller';
import { UrlFrontier } from './url-frontier';

@Module({
  imports: [
    BullModule.registerQueue({
      name: CRAWL_QUEUE,
    }),
    ScraperModule,
    ApiKeyModule,
  ],
  controllers: [CrawlerController],
  providers: [CrawlerService, CrawlerProcessor, UrlFrontier],
  exports: [CrawlerService],
})
export class CrawlerModule {}
