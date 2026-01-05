/**
 * Admin Storage Module
 * 云同步管理模块
 */

import { Module } from '@nestjs/common';
import { AdminStorageController } from './admin-storage.controller';
import { AdminStorageService } from './admin-storage.service';
import { PrismaModule } from '../prisma';
import { StorageModule } from '../storage/storage.module';
import { VectorizeModule } from '../vectorize/vectorize.module';

@Module({
  imports: [PrismaModule, StorageModule, VectorizeModule],
  controllers: [AdminStorageController],
  providers: [AdminStorageService],
  exports: [AdminStorageService],
})
export class AdminStorageModule {}
