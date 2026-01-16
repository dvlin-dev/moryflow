// apps/server/src/map/map.module.ts
import { Module } from '@nestjs/common';
import { MapService } from './map.service';
import { MapController } from './map.controller';
import { SitemapParser } from './sitemap-parser';
import { ApiKeyModule } from '../api-key';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [ApiKeyModule, BillingModule],
  controllers: [MapController],
  providers: [MapService, SitemapParser],
  exports: [MapService],
})
export class MapModule {}
