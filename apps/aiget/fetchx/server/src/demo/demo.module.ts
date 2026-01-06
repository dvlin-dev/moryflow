import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { ScraperModule } from '../scraper';
import { MapModule } from '../map/map.module';
import { ExtractModule } from '../extract/extract.module';
import { SearchModule } from '../search/search.module';

/**
 * Demo 模块
 * 提供官网 Playground 的演示功能
 */
@Module({
  imports: [ScraperModule, MapModule, ExtractModule, SearchModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
