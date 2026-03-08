/**
 * [PROVIDES]: Retrieval public API + domain search services
 * [POS]: Memox Retrieval 模块
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-key';
import { BillingModule } from '../billing/billing.module';
import { EmbeddingModule } from '../embedding';
import { GraphModule } from '../graph';
import { MemoryModule } from '../memory';
import { VectorPrismaModule } from '../vector-prisma';
import { RetrievalController } from './retrieval.controller';
import { RetrievalService } from './retrieval.service';
import { MemoryFactSearchService } from './memory-fact-search.service';
import { SourceSearchService } from './source-search.service';
import { SourceSearchRepository } from './source-search.repository';

@Module({
  imports: [
    ApiKeyModule,
    BillingModule,
    EmbeddingModule,
    GraphModule,
    MemoryModule,
    VectorPrismaModule,
  ],
  controllers: [RetrievalController],
  providers: [
    RetrievalService,
    MemoryFactSearchService,
    SourceSearchService,
    SourceSearchRepository,
  ],
  exports: [RetrievalService],
})
export class RetrievalModule {}
