/**
 * Console Playground Module
 * Playground 代理模块（Session 认证）
 */

import { Module } from '@nestjs/common';
import { ConsolePlaygroundController } from './console-playground.controller';
import { ConsolePlaygroundService } from './console-playground.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScraperModule } from '../scraper/scraper.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { SearchModule } from '../search/search.module';
import { MapModule } from '../map/map.module';
import { ExtractModule } from '../extract/extract.module';

@Module({
  imports: [
    PrismaModule,
    ScraperModule,
    CrawlerModule,
    SearchModule,
    MapModule,
    ExtractModule,
  ],
  controllers: [ConsolePlaygroundController],
  providers: [ConsolePlaygroundService],
})
export class ConsolePlaygroundModule {}
