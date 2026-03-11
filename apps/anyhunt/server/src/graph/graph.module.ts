/**
 * [PROVIDES]: Graph projection + graph context
 * [POS]: Memox Graph 模块
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-key';
import { QueueModule } from '../queue';
import { VectorPrismaModule } from '../vector-prisma';
import { MemoryModule } from '../memory';
import { StorageModule } from '../storage';
import { GraphController } from './graph.controller';
import { GraphContextService } from './graph-context.service';
import { GraphOverviewService } from './graph-overview.service';
import { GraphProjectionService } from './graph-projection.service';
import { GraphProcessor } from './graph.processor';
import { GraphQueryService } from './graph-query.service';

@Module({
  imports: [
    ApiKeyModule,
    QueueModule,
    VectorPrismaModule,
    MemoryModule,
    StorageModule,
  ],
  controllers: [GraphController],
  providers: [
    GraphContextService,
    GraphOverviewService,
    GraphProjectionService,
    GraphProcessor,
    GraphQueryService,
  ],
  exports: [
    GraphContextService,
    GraphOverviewService,
    GraphProjectionService,
    GraphQueryService,
  ],
})
export class GraphModule {}
