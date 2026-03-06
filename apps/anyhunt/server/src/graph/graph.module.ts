/**
 * [PROVIDES]: Graph projection + graph context
 * [POS]: Memox Graph 模块
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
