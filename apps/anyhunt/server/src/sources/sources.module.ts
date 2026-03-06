/**
 * [PROVIDES]: KnowledgeSource services/repositories + chunking/storage services
 * [POS]: Memox Sources 领域模块
 */

import { Module } from '@nestjs/common';
import { VectorPrismaModule } from '../vector-prisma';
import { StorageModule } from '../storage';
import { EmbeddingModule } from '../embedding';
import { MemoxPlatformModule } from '../memox-platform';
import { QueueModule } from '../queue';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import { KnowledgeSourceRevisionRepository } from './knowledge-source-revision.repository';
import { SourceChunkRepository } from './source-chunk.repository';
import { KnowledgeSourceService } from './knowledge-source.service';
import { KnowledgeSourceDeletionService } from './knowledge-source-deletion.service';
import { KnowledgeSourceRevisionService } from './knowledge-source-revision.service';
import { SourceChunkingService } from './source-chunking.service';
import { SourceStorageService } from './source-storage.service';
import { SourcesController } from './sources.controller';
import { SourceRevisionsController } from './source-revisions.controller';
import { SourceCleanupProcessor } from './source-cleanup.processor';
import { SourceRevisionCleanupProcessor } from './source-revision-cleanup.processor';
import { SourceRevisionCleanupService } from './source-revision-cleanup.service';

@Module({
  imports: [
    VectorPrismaModule,
    StorageModule,
    EmbeddingModule,
    MemoxPlatformModule,
    QueueModule,
  ],
  controllers: [SourcesController, SourceRevisionsController],
  providers: [
    KnowledgeSourceRepository,
    KnowledgeSourceRevisionRepository,
    SourceChunkRepository,
    KnowledgeSourceService,
    KnowledgeSourceDeletionService,
    KnowledgeSourceRevisionService,
    SourceChunkingService,
    SourceStorageService,
    SourceCleanupProcessor,
    SourceRevisionCleanupService,
    SourceRevisionCleanupProcessor,
  ],
  exports: [
    KnowledgeSourceRepository,
    KnowledgeSourceRevisionRepository,
    SourceChunkRepository,
    KnowledgeSourceService,
    KnowledgeSourceDeletionService,
    KnowledgeSourceRevisionService,
    SourceRevisionCleanupService,
    SourceChunkingService,
    SourceStorageService,
  ],
})
export class SourcesModule {}
