import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';
import { MemoryRepository } from './memory.repository';
import { MemoryLlmService } from './services/memory-llm.service';
import { EmbeddingModule } from '../embedding';
import { BillingModule } from '../billing/billing.module';
import { ApiKeyModule } from '../api-key';
import { VectorPrismaModule } from '../vector-prisma';
import { StorageModule } from '../storage';
import { LlmModule } from '../llm';
import { MemoryBatchController } from './memory-batch.controller';
import { MemoryFeedbackController } from './memory-feedback.controller';
import { MemoryExportController } from './memory-export.controller';
import { QueueModule } from '../queue';
import { MemoryExportProcessor } from './memory-export.processor';
import { SourcesModule } from '../sources/sources.module';
import { SourceMemoryProjectionService } from './source-memory-projection.service';
import { SourceMemoryProjectionProcessor } from './source-memory-projection.processor';
import { MemoryOverviewService } from './memory-overview.service';
import { GraphScopeModule } from '../graph/graph-scope.module';

@Module({
  imports: [
    VectorPrismaModule,
    EmbeddingModule,
    BillingModule,
    ApiKeyModule,
    StorageModule,
    LlmModule,
    QueueModule,
    SourcesModule,
    GraphScopeModule,
  ],
  controllers: [
    MemoryController,
    MemoryBatchController,
    MemoryFeedbackController,
    MemoryExportController,
  ],
  providers: [
    MemoryService,
    MemoryRepository,
    MemoryLlmService,
    MemoryOverviewService,
    MemoryExportProcessor,
    SourceMemoryProjectionService,
    SourceMemoryProjectionProcessor,
  ],
  exports: [
    MemoryService,
    MemoryRepository,
    MemoryLlmService,
    MemoryOverviewService,
    SourceMemoryProjectionService,
  ],
})
export class MemoryModule {}
