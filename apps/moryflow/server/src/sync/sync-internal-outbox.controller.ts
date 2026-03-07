/**
 * [INPUT]: 内部 claim/ack 请求
 * [OUTPUT]: outbox 批次事件 / ack 结果
 * [POS]: Sync projection consumer 的内部控制面
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
import { FileLifecycleOutboxLeaseService } from './file-lifecycle-outbox-lease.service';
import type { FileLifecycleOutboxRecord } from './file-lifecycle-outbox.types';
import {
  SyncInternalOutboxAckRequestDto,
  type SyncInternalOutboxAckResponseDto,
  SyncInternalOutboxClaimRequestDto,
  type SyncInternalOutboxClaimResponseDto,
} from './dto';

@ApiExcludeController()
@UseGuards(InternalApiTokenGuard)
@Controller({ path: 'internal/sync/outbox', version: VERSION_NEUTRAL })
export class SyncInternalOutboxController {
  constructor(
    private readonly fileLifecycleOutboxLeaseService: FileLifecycleOutboxLeaseService,
  ) {}

  @Post('claim')
  async claimBatch(
    @Body() dto: SyncInternalOutboxClaimRequestDto,
  ): Promise<SyncInternalOutboxClaimResponseDto> {
    const events =
      await this.fileLifecycleOutboxLeaseService.claimPendingBatch(dto);
    return {
      events: events.map((event) => this.serializeEvent(event)),
    };
  }

  @Post('ack')
  async acknowledgeBatch(
    @Body() dto: SyncInternalOutboxAckRequestDto,
  ): Promise<SyncInternalOutboxAckResponseDto> {
    const acknowledged =
      await this.fileLifecycleOutboxLeaseService.ackClaimedBatch(
        dto.consumerId,
        dto.ids,
      );
    return { acknowledged };
  }

  private serializeEvent(
    event: FileLifecycleOutboxRecord,
  ): SyncInternalOutboxClaimResponseDto['events'][number] {
    return {
      id: event.id,
      userId: event.userId,
      vaultId: event.vaultId,
      fileId: event.fileId,
      eventType: event.eventType,
      payload:
        event.payload &&
        typeof event.payload === 'object' &&
        !Array.isArray(event.payload)
          ? (event.payload as Record<string, unknown>)
          : {},
      createdAt: event.createdAt,
      leaseExpiresAt: event.leaseExpiresAt,
    };
  }
}
