import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ZodError } from 'zod';
import {
  WorkspaceContentOutboxEventType,
  WorkspaceContentOutboxResultDisposition,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma';
import { MemoxGatewayError } from './memox.client';
import { MemoxTelemetryService } from './memox-telemetry.service';
import {
  WorkspaceContentDeletePayloadSchema,
  WorkspaceContentUpsertPayloadSchema,
} from './memox-source-contract';
import { MemoxWorkspaceContentProjectionService } from './memox-workspace-content-projection.service';

const MAX_ATTEMPTS = 5;

export interface MemoxWorkspaceContentConsumerOptions {
  consumerId: string;
  limit: number;
  leaseMs: number;
}

export interface MemoxWorkspaceContentConsumeResult {
  claimed: number;
  acknowledged: number;
  failedIds: string[];
  deadLetteredIds: string[];
}

type WorkspaceContentOutboxRecord = Awaited<
  ReturnType<PrismaService['workspaceContentOutbox']['findMany']>
>[number];

class WorkspaceContentPoisonMessageError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WorkspaceContentPoisonMessageError';
  }
}

class WorkspaceContentLeaseLostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceContentLeaseLostError';
  }
}

@Injectable()
export class MemoxWorkspaceContentConsumerService {
  private readonly logger = new Logger(
    MemoxWorkspaceContentConsumerService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectionService: MemoxWorkspaceContentProjectionService,
    private readonly telemetryService: MemoxTelemetryService,
  ) {}

  async processBatch(
    options: MemoxWorkspaceContentConsumerOptions,
  ): Promise<MemoxWorkspaceContentConsumeResult> {
    const leaseOwner = this.createLeaseOwner(options.consumerId);
    const events = await this.claimPendingBatch(options, leaseOwner);
    const failedIds: string[] = [];
    const deadLetteredIds: string[] = [];
    let acknowledged = 0;

    for (const event of events) {
      try {
        const result = await this.processEvent(event);
        acknowledged += await this.markProcessed(
          leaseOwner,
          event.id,
          result.disposition,
        );
      } catch (error) {
        failedIds.push(event.id);
        this.logger.error(
          `Failed to process workspace content outbox event ${event.id}`,
          error instanceof Error ? error.stack : undefined,
        );
        const state = await this.recordFailure(leaseOwner, event, error);
        if (state === 'dead_lettered') {
          deadLetteredIds.push(event.id);
        }
      }
    }

    this.telemetryService.recordBatch({
      claimed: events.length,
      acknowledged,
      failedIds,
      deadLetteredIds,
    });

    return {
      claimed: events.length,
      acknowledged,
      failedIds,
      deadLetteredIds,
    };
  }

  private async claimPendingBatch(
    options: MemoxWorkspaceContentConsumerOptions,
    leaseOwner: string,
  ): Promise<WorkspaceContentOutboxRecord[]> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + options.leaseMs);
    const candidates = await this.prisma.workspaceContentOutbox.findMany({
      where: {
        processedAt: null,
        deadLetteredAt: null,
        OR: [{ leasedBy: null }, { leaseExpiresAt: { lt: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: options.limit,
    });

    const ids = candidates.map((event) => event.id);
    if (ids.length === 0) {
      return [];
    }

    await this.prisma.workspaceContentOutbox.updateMany({
      where: {
        id: { in: ids },
        processedAt: null,
        deadLetteredAt: null,
        OR: [{ leasedBy: null }, { leaseExpiresAt: { lt: now } }],
      },
      data: {
        leasedBy: leaseOwner,
        leaseExpiresAt,
        lastAttemptAt: now,
      },
    });

    return this.prisma.workspaceContentOutbox.findMany({
      where: {
        id: { in: ids },
        leasedBy: leaseOwner,
        processedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async processEvent(event: WorkspaceContentOutboxRecord): Promise<{
    disposition: WorkspaceContentOutboxResultDisposition | null;
  }> {
    if (event.eventType === WorkspaceContentOutboxEventType.UPSERT) {
      if (!event.revisionId) {
        throw new WorkspaceContentPoisonMessageError(
          'WORKSPACE_CONTENT_REVISION_ID_MISSING',
          'Workspace content UPSERT event missing revisionId',
        );
      }
      const payload = this.parsePayload(
        WorkspaceContentUpsertPayloadSchema,
        event.payload,
      );
      return this.projectionService.upsertDocument({
        eventId: event.id,
        revisionId: event.revisionId,
        ...payload,
      });
    }

    if (event.eventType === WorkspaceContentOutboxEventType.DELETE) {
      const payload = this.parsePayload(
        WorkspaceContentDeletePayloadSchema,
        event.payload,
      );
      return this.projectionService.deleteDocument({
        eventId: event.id,
        ...payload,
      });
    }

    throw new WorkspaceContentPoisonMessageError(
      'WORKSPACE_CONTENT_EVENT_TYPE_UNSUPPORTED',
      `Unsupported workspace content event type: ${String(event.eventType)}`,
    );
  }

  private parsePayload<T extends { parse: (value: unknown) => unknown }>(
    schema: T,
    payload: unknown,
  ): ReturnType<T['parse']> {
    try {
      return schema.parse(payload) as ReturnType<T['parse']>;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new WorkspaceContentPoisonMessageError(
          'WORKSPACE_CONTENT_PAYLOAD_INVALID',
          error.message,
        );
      }
      throw error;
    }
  }

  private createLeaseOwner(consumerId: string): string {
    return `${consumerId}:${randomUUID()}`;
  }

  private async markProcessed(
    consumerId: string,
    id: string,
    resultDisposition: WorkspaceContentOutboxResultDisposition | null,
  ): Promise<number> {
    const result = await this.prisma.workspaceContentOutbox.updateMany({
      where: {
        id,
        leasedBy: consumerId,
        processedAt: null,
      },
      data: {
        processedAt: new Date(),
        resultDisposition,
        leasedBy: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });

    if (result.count !== 1) {
      throw new WorkspaceContentLeaseLostError(
        `Workspace content outbox lease lost before acknowledging event ${id}`,
      );
    }

    return result.count;
  }

  private async recordFailure(
    consumerId: string,
    event: WorkspaceContentOutboxRecord,
    error: unknown,
  ): Promise<'retry_scheduled' | 'dead_lettered'> {
    const nextAttemptCount = event.attemptCount + 1;
    const terminal =
      !this.isRetryable(error) || nextAttemptCount >= MAX_ATTEMPTS;

    const result = await this.prisma.workspaceContentOutbox.updateMany({
      where: {
        id: event.id,
        leasedBy: consumerId,
        processedAt: null,
      },
      data: {
        attemptCount: nextAttemptCount,
        leasedBy: null,
        leaseExpiresAt: null,
        resultDisposition: null,
        lastErrorCode: this.readFailureCode(error),
        lastErrorMessage: this.readFailureMessage(error),
        deadLetteredAt: terminal ? new Date() : null,
      },
    });

    if (result.count !== 1) {
      throw new WorkspaceContentLeaseLostError(
        `Workspace content outbox lease lost before persisting failure for event ${event.id}`,
      );
    }

    this.telemetryService.recordFailure({
      deadLettered: terminal,
      poison: error instanceof WorkspaceContentPoisonMessageError,
    });

    return terminal ? 'dead_lettered' : 'retry_scheduled';
  }

  private readFailureCode(error: unknown): string {
    if (error instanceof WorkspaceContentPoisonMessageError) {
      return error.code;
    }
    if (error instanceof MemoxGatewayError) {
      return error.code ?? 'MEMOX_GATEWAY_ERROR';
    }
    return 'WORKSPACE_CONTENT_EVENT_FAILED';
  }

  private readFailureMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof WorkspaceContentPoisonMessageError) {
      return false;
    }
    if (error instanceof ZodError) {
      return false;
    }
    if (error instanceof MemoxGatewayError) {
      return (
        error.status === 408 ||
        error.status === 429 ||
        error.status >= 500 ||
        (error.status === 409 &&
          error.code === 'IDEMPOTENCY_REQUEST_IN_PROGRESS')
      );
    }
    return true;
  }
}
