/**
 * Vault Module
 * Vault 管理模块
 */

import { Module, forwardRef } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { VaultDeletionService } from './vault-deletion.service';
import { StorageModule } from '../storage';
import { QuotaModule } from '../quota';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [StorageModule, QuotaModule, forwardRef(() => SyncModule)],
  controllers: [VaultController],
  providers: [VaultService, VaultDeletionService],
  exports: [VaultService, VaultDeletionService],
})
export class VaultModule {}
