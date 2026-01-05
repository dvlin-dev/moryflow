/**
 * Storage Module
 * R2 存储服务模块（服务端代理模式）
 */

import { Module } from '@nestjs/common';
import { R2Service } from './r2.service';
import { StorageClient } from './storage.client';
import { StorageController } from './storage.controller';

@Module({
  controllers: [StorageController],
  providers: [R2Service, StorageClient],
  exports: [StorageClient, R2Service],
})
export class StorageModule {}
