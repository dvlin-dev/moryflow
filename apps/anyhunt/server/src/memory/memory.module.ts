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

@Module({
  imports: [
    VectorPrismaModule,
    EmbeddingModule,
    BillingModule,
    ApiKeyModule,
    StorageModule,
    LlmModule,
  ],
  controllers: [
    MemoryController,
    MemoryBatchController,
    MemoryFeedbackController,
    MemoryExportController,
  ],
  providers: [MemoryService, MemoryRepository, MemoryLlmService],
  exports: [MemoryService, MemoryRepository],
})
export class MemoryModule {}
