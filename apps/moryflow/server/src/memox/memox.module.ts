import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncModule } from '../sync';
import { StorageModule } from '../storage';
import { MemoxClient } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import { MemoxSearchAdapterService } from './memox-search-adapter.service';
import {
  MemoxOutboxConsumerProcessor,
  MEMOX_OUTBOX_CONSUMER_QUEUE,
} from './memox-outbox-consumer.processor';
import { MemoxOutboxConsumerService } from './memox-outbox-consumer.service';
import { MemoxFileProjectionService } from './memox-file-projection.service';
import { MemoxOutboxDrainService } from './memox-outbox-drain.service';
import { MemoxCutoverService } from './memox-cutover.service';
import { LegacyVectorSearchClient } from './legacy-vector-search.client';
import { MemoxRuntimeConfigService } from './memox-runtime-config.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MEMOX_OUTBOX_CONSUMER_QUEUE,
    }),
    SyncModule,
    StorageModule,
  ],
  providers: [
    MemoxRuntimeConfigService,
    MemoxClient,
    MemoxSourceBridgeService,
    MemoxSearchAdapterService,
    MemoxFileProjectionService,
    MemoxOutboxConsumerService,
    MemoxOutboxConsumerProcessor,
    MemoxOutboxDrainService,
    MemoxCutoverService,
    LegacyVectorSearchClient,
  ],
  exports: [
    MemoxRuntimeConfigService,
    MemoxClient,
    MemoxSourceBridgeService,
    MemoxSearchAdapterService,
    MemoxFileProjectionService,
    MemoxFileProjectionService,
    MemoxOutboxConsumerService,
    MemoxCutoverService,
    LegacyVectorSearchClient,
  ],
})
export class MemoxModule {}
