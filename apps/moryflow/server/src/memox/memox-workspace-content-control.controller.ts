/**
 * [INPUT]: replay / redrive 参数
 * [OUTPUT]: workspace content replay 结果
 * [POS]: Memox workspace-content 内部控制面，仅供内部补偿与排障使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Body,
  Controller,
  Post,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalApiTokenGuard } from '../common/guards/internal-api-token.guard';
import { MemoxWorkspaceContentReplayDto } from './dto/memox-control.dto';
import { MemoxWorkspaceContentControlService } from './memox-workspace-content-control.service';

@ApiExcludeController()
@UseGuards(InternalApiTokenGuard)
@Controller({
  path: 'internal/sync/memox/workspace-content',
  version: VERSION_NEUTRAL,
})
export class MemoxWorkspaceContentControlController {
  constructor(
    private readonly controlService: MemoxWorkspaceContentControlService,
  ) {}

  @Post('replay')
  async replay(@Body() body: MemoxWorkspaceContentReplayDto) {
    const redrivenCount =
      body.redriveDeadLetterLimit > 0
        ? await this.controlService.redriveDeadLetters(
            body.redriveDeadLetterLimit,
          )
        : 0;

    const replay = await this.controlService.replayOutbox({
      batchSize: body.batchSize,
      maxBatches: body.maxBatches,
      leaseMs: body.leaseMs,
      consumerId: body.consumerId,
    });

    return {
      redrivenCount,
      ...replay,
    };
  }
}
