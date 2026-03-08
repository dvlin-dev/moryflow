/**
 * [PROVIDES]: Graph projection + graph context
 * [POS]: Memox Graph 模块
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Module } from '@nestjs/common';
import { QueueModule } from '../queue';
import { VectorPrismaModule } from '../vector-prisma';
import { MemoryModule } from '../memory';
import { StorageModule } from '../storage';
import { GraphContextService } from './graph-context.service';
import { GraphProjectionService } from './graph-projection.service';
import { GraphProcessor } from './graph.processor';

@Module({
  imports: [QueueModule, VectorPrismaModule, MemoryModule, StorageModule],
  providers: [GraphContextService, GraphProjectionService, GraphProcessor],
  exports: [GraphContextService, GraphProjectionService],
})
export class GraphModule {}
