/**
 * [INPUT]: 无
 * [OUTPUT]: memox ingestion telemetry snapshot
 * [POS]: Memox 内部观测端点，仅供内部抓取与排障使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Controller, Get, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../auth';
import { InternalApiTokenGuard } from '../common/guards/internal-api-token.guard';
import {
  MemoxTelemetryService,
  type MemoxTelemetrySnapshot,
} from './memox-telemetry.service';

@ApiExcludeController()
@Public()
@UseGuards(InternalApiTokenGuard)
@Controller({ path: 'internal/metrics/memox', version: VERSION_NEUTRAL })
export class MemoxInternalMetricsController {
  constructor(private readonly memoxTelemetryService: MemoxTelemetryService) {}

  @Get()
  async getSnapshot(): Promise<MemoxTelemetrySnapshot> {
    return this.memoxTelemetryService.getSnapshot();
  }
}
