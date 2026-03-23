import { Module } from '@nestjs/common';
import { StorageModule } from '../storage';
import { MemoxClient } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import { MemoxSearchAdapterService } from './memox-search-adapter.service';
import { MemoxWorkspaceContentProjectionService } from './memox-workspace-content-projection.service';
import { MemoxWorkspaceContentConsumerService } from './memox-workspace-content-consumer.service';
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
  imports: [StorageModule],
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
