/**
 * Vault Module
 * Vault 管理模块
 */

import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { StorageModule } from '../storage';

@Module({
  imports: [StorageModule],
  controllers: [VaultController],
  providers: [VaultService],
  exports: [VaultService],
})
export class VaultModule {}
