import { Injectable, Logger } from '@nestjs/common';
import type { VectorClock } from '@moryflow/sync';
import { FileLifecycleOutboxLeaseService } from '../sync/file-lifecycle-outbox-lease.service';
import type {
  FileDeletedLifecyclePayload,
  FileUpsertedLifecyclePayload,
} from '../sync/file-lifecycle-outbox.types';
import { MemoxGatewayError } from './memox.client';
import {
  MemoxFileProjectionService,
  type MemoxDeleteFileInput,
  type MemoxUpsertFileInput,
} from './memox-file-projection.service';

export interface MemoxOutboxConsumerOptions {
  consumerId: string;
  limit: number;
  leaseMs: number;
}

export interface MemoxOutboxConsumeResult {
  claimed: number;
  acknowledged: number;
  failedIds: string[];
  deadLetteredIds: string[];
}

interface OutboxEventRecord {
  id: string;
  userId: string;
  vaultId: string;
  fileId: string;
  eventType: string;
  attemptCount?: number;
  payload: Record<string, unknown>;
}

class MemoxOutboxPoisonMessageError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'MemoxOutboxPoisonMessageError';
  }
}

@Injectable()
export class MemoxOutboxConsumerService {
  private readonly logger = new Logger(MemoxOutboxConsumerService.name);

  constructor(
    private readonly fileLifecycleOutboxLeaseService: FileLifecycleOutboxLeaseService,
    private readonly fileProjectionService: MemoxFileProjectionService,
  ) {}

  async processBatch(
    options: MemoxOutboxConsumerOptions,
  ): Promise<MemoxOutboxConsumeResult> {
    const events =
      (await this.fileLifecycleOutboxLeaseService.claimPendingBatch(
        options,
      )) as OutboxEventRecord[];
    const successfulIds: string[] = [];
    const failedIds: string[] = [];
    const deadLetteredIds: string[] = [];
    let batchError: unknown = null;

    for (const event of events) {
      try {
        await this.processEvent(event);
        successfulIds.push(event.id);
      } catch (error) {
        failedIds.push(event.id);
        this.logger.error(
          `Failed to process outbox event ${event.id}`,
          error instanceof Error ? error.stack : undefined,
        );
        try {
          const failureState = await this.recordFailedEvent(
            options.consumerId,
            event,
            error,
          );
          if (failureState === 'dead_lettered') {
            deadLetteredIds.push(event.id);
          }
        } catch (recordError) {
          this.logger.error(
            `Failed to persist outbox failure state for ${event.id}`,
            recordError instanceof Error ? recordError.stack : undefined,
          );
          batchError = recordError;
          break;
        }
      }
    }

    const acknowledged =
      successfulIds.length > 0
        ? await this.fileLifecycleOutboxLeaseService.ackClaimedBatch(
            options.consumerId,
            successfulIds,
          )
        : 0;

    if (batchError) {
      throw batchError;
    }

    return {
      claimed: events.length,
      acknowledged,
      failedIds,
      deadLetteredIds,
    };
  }

  private async processEvent(event: OutboxEventRecord): Promise<void> {
    if (event.eventType === 'file_upserted') {
      const payload = this.parseUpsertedPayload(event);
      await this.fileProjectionService.upsertFile({
        eventId: event.id,
        userId: event.userId,
        vaultId: event.vaultId,
        fileId: event.fileId,
        path: payload.path,
        title: payload.title,
        contentHash: payload.contentHash,
        storageRevision: payload.storageRevision,
        previousContentHash: payload.previousContentHash,
        previousStorageRevision: payload.previousStorageRevision,
      });
      return;
    }

    if (event.eventType === 'file_deleted') {
      this.parseDeletedPayload(event);
      await this.fileProjectionService.deleteFile({
        eventId: event.id,
        userId: event.userId,
        vaultId: event.vaultId,
        fileId: event.fileId,
      });
      return;
    }

    throw new MemoxOutboxPoisonMessageError(
      'OUTBOX_EVENT_TYPE_UNSUPPORTED',
      `Unsupported outbox event type: ${event.eventType}`,
    );
  }

  private async recordFailedEvent(
    consumerId: string,
    event: OutboxEventRecord,
    error: unknown,
  ): Promise<'retry_scheduled' | 'dead_lettered'> {
    const attemptCount = this.readAttemptCount(event);
    const result = await this.fileLifecycleOutboxLeaseService.failClaimedEvent({
      consumerId,
      id: event.id,
      attemptCount,
      errorCode: this.readFailureCode(error),
      errorMessage: this.readFailureMessage(error),
      retryable: this.isRetryableFailure(error),
    });

    if (result.state === 'dead_lettered') {
      this.logger.warn(`Dead-lettered outbox event ${event.id}`);
    }

    return result.state;
  }

  private readAttemptCount(event: OutboxEventRecord): number {
    return typeof event.attemptCount === 'number' && event.attemptCount > 0
      ? event.attemptCount
      : 1;
  }

  private readFailureCode(error: unknown): string | null {
    if (error instanceof MemoxOutboxPoisonMessageError) {
      return error.code;
    }

    if (error instanceof MemoxGatewayError) {
      return error.code ?? null;
    }

    return 'OUTBOX_EVENT_FAILED';
  }

  private readFailureMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private isRetryableFailure(error: unknown): boolean {
    if (error instanceof MemoxGatewayError) {
      return (
        error.status === 408 || error.status === 429 || error.status >= 500
      );
    }

    if (error instanceof MemoxOutboxPoisonMessageError) {
      return false;
    }

    return true;
  }

  private parseUpsertedPayload(
    event: OutboxEventRecord,
  ): FileUpsertedLifecyclePayload {
    return {
      path: this.readRequiredStringField(event, 'path'),
      title: this.readRequiredStringField(event, 'title'),
      size: this.readRequiredNumberField(event, 'size'),
      contentHash: this.readRequiredStringField(event, 'contentHash'),
      storageRevision: this.readRequiredStringField(event, 'storageRevision'),
      vectorClock: this.readRequiredVectorClock(event, 'vectorClock'),
      previousPath: this.readOptionalStringField(event, 'previousPath'),
      previousContentHash: this.readOptionalStringField(
        event,
        'previousContentHash',
      ),
      previousStorageRevision: this.readOptionalStringField(
        event,
        'previousStorageRevision',
      ),
    };
  }

  private parseDeletedPayload(
    event: OutboxEventRecord,
  ): FileDeletedLifecyclePayload {
    return {
      path: this.readOptionalStringField(event, 'path'),
      contentHash: this.readOptionalStringField(event, 'contentHash'),
      storageRevision: this.readOptionalStringField(event, 'storageRevision'),
    };
  }

  private readRequiredStringField(
    event: OutboxEventRecord,
    field: string,
  ): string {
    const value = event.payload[field];
    if (typeof value !== 'string' || value.length === 0) {
      throw new MemoxOutboxPoisonMessageError(
        'OUTBOX_PAYLOAD_INVALID',
        `Invalid outbox payload: ${event.eventType}.${field}`,
      );
    }

    return value;
  }

  private readOptionalStringField(
    event: OutboxEventRecord,
    field: string,
  ): string | null {
    const value = event.payload[field];
    if (value == null) {
      return null;
    }
    if (typeof value !== 'string' || value.length === 0) {
      throw new MemoxOutboxPoisonMessageError(
        'OUTBOX_PAYLOAD_INVALID',
        `Invalid outbox payload: ${event.eventType}.${field}`,
      );
    }

    return value;
  }

  private readRequiredNumberField(
    event: OutboxEventRecord,
    field: string,
  ): number {
    const value = event.payload[field];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new MemoxOutboxPoisonMessageError(
        'OUTBOX_PAYLOAD_INVALID',
        `Invalid outbox payload: ${event.eventType}.${field}`,
      );
    }

    return value;
  }

  private readRequiredVectorClock(
    event: OutboxEventRecord,
    field: string,
  ): VectorClock {
    const value = event.payload[field];
    if (!this.isVectorClock(value)) {
      throw new MemoxOutboxPoisonMessageError(
        'OUTBOX_PAYLOAD_INVALID',
        `Invalid outbox payload: ${event.eventType}.${field}`,
      );
    }

    return value;
  }

  private isVectorClock(value: unknown): value is VectorClock {
    return (
      typeof value === 'object' &&
      value !== null &&
      Object.values(value).every(
        (entry) => typeof entry === 'number' && Number.isFinite(entry),
      )
    );
  }
}
