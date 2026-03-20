/**
 * [PROVIDES]: KnowledgeSource services/repositories + chunking/storage services
 * [POS]: Memox Sources 领域模块
 */

import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-key';
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
import { SourceIdentitiesController } from './source-identities.controller';
import { SourceRevisionsController } from './source-revisions.controller';
import { SourceCleanupProcessor } from './source-cleanup.processor';
import { SourceCleanupRecoveryService } from './source-cleanup-recovery.service';
import { SourceRevisionCleanupProcessor } from './source-revision-cleanup.processor';
import { SourceRevisionCleanupService } from './source-revision-cleanup.service';
import { ReindexMaintenanceController } from './reindex-maintenance.controller';
import { ReindexMaintenanceProcessor } from './reindex-maintenance.processor';
import { ReindexMaintenanceService } from './reindex-maintenance.service';

@Module({
  imports: [
    ApiKeyModule,
    VectorPrismaModule,
    StorageModule,
    EmbeddingModule,
    MemoxPlatformModule,
    QueueModule,
  ],
  controllers: [
    SourcesController,
    SourceIdentitiesController,
    SourceRevisionsController,
    ReindexMaintenanceController,
  ],
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
    SourceCleanupRecoveryService,
    SourceRevisionCleanupService,
    SourceRevisionCleanupProcessor,
    ReindexMaintenanceProcessor,
    ReindexMaintenanceService,
  ],
  exports: [
    KnowledgeSourceRepository,
    KnowledgeSourceRevisionRepository,
    SourceChunkRepository,
    KnowledgeSourceService,
    KnowledgeSourceDeletionService,
    KnowledgeSourceRevisionService,
    SourceCleanupRecoveryService,
    SourceRevisionCleanupService,
    SourceChunkingService,
    SourceStorageService,
    ReindexMaintenanceService,
  ],
})
export class SourcesModule {}
