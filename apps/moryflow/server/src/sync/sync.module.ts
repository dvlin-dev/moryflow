/**
 * Sync Module
 * 同步模块
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncPlanService } from './sync-plan.service';
import { SyncUploadContractService } from './sync-upload-contract.service';
import { SyncObjectVerifyService } from './sync-object-verify.service';
import { SyncCommitService } from './sync-commit.service';
import { SyncOrphanCleanupService } from './sync-orphan-cleanup.service';
import { SyncActionTokenService } from './sync-action-token.service';
import { SyncCleanupService, SYNC_CLEANUP_QUEUE } from './sync-cleanup.service';
import { SyncCleanupProcessor } from './sync-cleanup.processor';
import { FileLifecycleOutboxLeaseService } from './file-lifecycle-outbox-lease.service';
import { FileLifecycleOutboxWriterService } from './file-lifecycle-outbox-writer.service';
import { SyncStorageDeletionService } from './sync-storage-deletion.service';
import { SyncTelemetryService } from './sync-telemetry.service';
import { SyncInternalMetricsController } from './sync-internal-metrics.controller';
import { SyncInternalOutboxController } from './sync-internal-outbox.controller';
import { InternalApiTokenGuard } from '../common/guards/internal-api-token.guard';
import { VaultModule } from '../vault';
import { QuotaModule } from '../quota';
import { StorageModule } from '../storage';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SYNC_CLEANUP_QUEUE,
    }),
    VaultModule,
    QuotaModule,
    StorageModule,
  ],
  controllers: [
    SyncController,
    SyncInternalMetricsController,
    SyncInternalOutboxController,
  ],
  providers: [
    SyncService,
    SyncPlanService,
    SyncUploadContractService,
    SyncActionTokenService,
    SyncObjectVerifyService,
    SyncCommitService,
    SyncOrphanCleanupService,
    SyncCleanupService,
    SyncCleanupProcessor,
    FileLifecycleOutboxWriterService,
    FileLifecycleOutboxLeaseService,
    SyncStorageDeletionService,
    SyncTelemetryService,
    InternalApiTokenGuard,
  ],
  exports: [
    SyncService,
    SyncPlanService,
    SyncUploadContractService,
    SyncActionTokenService,
    SyncObjectVerifyService,
    SyncCommitService,
    SyncOrphanCleanupService,
    SyncCleanupService,
    FileLifecycleOutboxWriterService,
    FileLifecycleOutboxLeaseService,
    SyncStorageDeletionService,
    SyncTelemetryService,
  ],
})
export class SyncModule {}
