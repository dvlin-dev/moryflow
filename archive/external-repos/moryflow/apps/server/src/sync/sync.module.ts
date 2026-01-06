/**
 * Sync Module
 * 同步模块
 */

import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { VaultModule } from '../vault';
import { QuotaModule } from '../quota';
import { StorageModule } from '../storage';
import { VectorizeModule } from '../vectorize';

@Module({
  imports: [VaultModule, QuotaModule, StorageModule, VectorizeModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
