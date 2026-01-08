// apps/server/src/scraper/scraper.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SCRAPE_QUEUE } from '../queue/queue.constants';
import { StorageModule } from '../storage/storage.module';
import { ApiKeyModule } from '../api-key';
import { BillingModule } from '../billing/billing.module';

// Service & Processor
import { ScraperService } from './scraper.service';
import { ScraperProcessor } from './scraper.processor';
import { ScraperController } from './scraper.controller';

// Handlers (Single Responsibility)
import { PageConfigHandler } from './handlers/page-config.handler';
import { WaitStrategyHandler } from './handlers/wait-strategy.handler';
import { ScreenshotHandler } from './handlers/screenshot.handler';
import { PdfHandler } from './handlers/pdf.handler';
import { ActionExecutorHandler } from './handlers/action-executor.handler';
import { ImageProcessor } from './handlers/image-processor';

// Transformers
import { MarkdownTransformer } from './transformers/markdown.transformer';
import { ReadabilityTransformer } from './transformers/readability.transformer';
import { MetadataTransformer } from './transformers/metadata.transformer';
import { LinksTransformer } from './transformers/links.transformer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SCRAPE_QUEUE,
    }),
    StorageModule,
    ApiKeyModule,
    BillingModule,
  ],
  controllers: [ScraperController],
  providers: [
    // Core Service
    ScraperService,
    ScraperProcessor,
    // Handlers
    PageConfigHandler,
    WaitStrategyHandler,
    ScreenshotHandler,
    PdfHandler,
    ActionExecutorHandler,
    ImageProcessor,
    // Transformers
    MarkdownTransformer,
    ReadabilityTransformer,
    MetadataTransformer,
    LinksTransformer,
  ],
  exports: [ScraperService],
})
export class ScraperModule {}
