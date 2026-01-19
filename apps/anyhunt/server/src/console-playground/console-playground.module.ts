/**
 * Console Playground Module
 * Playground 代理模块（Session 认证）
 */

import { Module } from '@nestjs/common';
import { ConsolePlaygroundController } from './console-playground.controller';
import { ConsolePlaygroundBrowserController } from './console-playground-browser.controller';
import { ConsolePlaygroundAgentController } from './console-playground-agent.controller';
import { ConsolePlaygroundService } from './console-playground.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScraperModule } from '../scraper/scraper.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { SearchModule } from '../search/search.module';
import { MapModule } from '../map/map.module';
import { ExtractModule } from '../extract/extract.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [
    PrismaModule,
    ScraperModule,
    CrawlerModule,
    SearchModule,
    MapModule,
    ExtractModule,
    AgentModule,
  ],
  controllers: [
    ConsolePlaygroundController,
    ConsolePlaygroundBrowserController,
    ConsolePlaygroundAgentController,
  ],
  providers: [ConsolePlaygroundService],
})
export class ConsolePlaygroundModule {}
