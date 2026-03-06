/**
 * Sync Module
 * 同步模块
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncCleanupService, SYNC_CLEANUP_QUEUE } from './sync-cleanup.service';
import { SyncCleanupProcessor } from './sync-cleanup.processor';
import { SyncStorageDeletionService } from './sync-storage-deletion.service';
import { VaultModule } from '../vault';
import { QuotaModule } from '../quota';
import { StorageModule } from '../storage';
import { VectorizeModule } from '../vectorize';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SYNC_CLEANUP_QUEUE,
    }),
    VaultModule,
    QuotaModule,
    StorageModule,
    VectorizeModule,
  ],
  controllers: [SyncController],
  providers: [
    SyncService,
    SyncCleanupService,
    SyncCleanupProcessor,
    SyncStorageDeletionService,
  ],
  exports: [SyncService, SyncCleanupService, SyncStorageDeletionService],
})
export class SyncModule {}
