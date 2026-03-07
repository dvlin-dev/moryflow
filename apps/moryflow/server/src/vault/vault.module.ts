/**
 * Vault Module
 * Vault 管理模块
 */

import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { VaultDeletionService } from './vault-deletion.service';
import { StorageModule } from '../storage';
import { QuotaModule } from '../quota';
import { FileLifecycleOutboxWriterService } from '../sync/file-lifecycle-outbox-writer.service';

@Module({
  imports: [StorageModule, QuotaModule],
  controllers: [VaultController],
  providers: [
    VaultService,
    VaultDeletionService,
    FileLifecycleOutboxWriterService,
  ],
  exports: [VaultService, VaultDeletionService],
})
export class VaultModule {}
