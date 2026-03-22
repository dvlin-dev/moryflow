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
import { InternalApiTokenGuard } from '../common/guards/internal-api-token.guard';
import { MemoxTelemetryService } from './memox-telemetry.service';
import { MemoxInternalMetricsController } from './memox-internal-metrics.controller';
import { MemoxWorkspaceContentControlService } from './memox-workspace-content-control.service';
import { MemoxWorkspaceContentControlController } from './memox-workspace-content-control.controller';
import { MemoxWorkspaceContentReconcileService } from './memox-workspace-content-reconcile.service';
import { MemoxWorkspaceContentReconcileScheduler } from './memox-workspace-content-reconcile.scheduler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MEMOX_WORKSPACE_CONTENT_QUEUE,
    }),
    StorageModule,
  ],
  controllers: [
    MemoxInternalMetricsController,
    MemoxWorkspaceContentControlController,
  ],
  providers: [
    InternalApiTokenGuard,
    MemoxRuntimeConfigService,
    MemoxTelemetryService,
    MemoxClient,
    MemoxSourceBridgeService,
    MemoxSearchAdapterService,
    MemoxWorkspaceContentProjectionService,
    MemoxWorkspaceContentConsumerService,
    MemoxWorkspaceContentConsumerProcessor,
    MemoxWorkspaceContentDrainService,
    MemoxWorkspaceContentControlService,
    MemoxWorkspaceContentReconcileService,
    MemoxWorkspaceContentReconcileScheduler,
  ],
  exports: [
    MemoxRuntimeConfigService,
    MemoxTelemetryService,
    MemoxClient,
    MemoxSourceBridgeService,
    MemoxSearchAdapterService,
    MemoxWorkspaceContentProjectionService,
    MemoxWorkspaceContentConsumerService,
    MemoxWorkspaceContentControlService,
    MemoxWorkspaceContentReconcileService,
  ],
})
export class MemoxModule {}
