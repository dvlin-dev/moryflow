import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StorageModule } from '../storage';
import { MemoxClient } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import { MemoxSearchAdapterService } from './memox-search-adapter.service';
import { MEMOX_WORKSPACE_CONTENT_QUEUE } from './memox-source-contract';
import { MemoxWorkspaceContentProjectionService } from './memox-workspace-content-projection.service';
import { MemoxWorkspaceContentConsumerService } from './memox-workspace-content-consumer.service';
import { MemoxWorkspaceContentConsumerProcessor } from './memox-workspace-content-consumer.processor';
import { MemoxWorkspaceContentDrainService } from './memox-workspace-content-drain.service';
import { MemoxRuntimeConfigService } from './memox-runtime-config.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MEMOX_WORKSPACE_CONTENT_QUEUE,
    }),
    StorageModule,
  ],
  providers: [
    MemoxRuntimeConfigService,
    MemoxClient,
    MemoxSourceBridgeService,
    MemoxSearchAdapterService,
    MemoxWorkspaceContentProjectionService,
    MemoxWorkspaceContentConsumerService,
    MemoxWorkspaceContentConsumerProcessor,
    MemoxWorkspaceContentDrainService,
  ],
  exports: [
    MemoxRuntimeConfigService,
    MemoxClient,
    MemoxSourceBridgeService,
    MemoxSearchAdapterService,
    MemoxWorkspaceContentProjectionService,
    MemoxWorkspaceContentConsumerService,
  ],
})
export class MemoxModule {}
