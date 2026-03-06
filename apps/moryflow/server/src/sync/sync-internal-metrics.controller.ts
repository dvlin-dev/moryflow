/**
 * [INPUT]: 无
 * [OUTPUT]: sync telemetry snapshot
 * [POS]: 云同步内部观测端点，仅供内部抓取与排障使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Controller, Get, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalApiTokenGuard } from '../common/guards/internal-api-token.guard';
import {
  SyncTelemetryService,
  type SyncTelemetrySnapshot,
} from './sync-telemetry.service';

@ApiExcludeController()
@UseGuards(InternalApiTokenGuard)
@Controller({ path: 'internal/metrics/sync', version: VERSION_NEUTRAL })
export class SyncInternalMetricsController {
  constructor(private readonly syncTelemetryService: SyncTelemetryService) {}

  @Get()
  async getSnapshot(): Promise<SyncTelemetrySnapshot> {
    return this.syncTelemetryService.getSnapshot();
  }
}
