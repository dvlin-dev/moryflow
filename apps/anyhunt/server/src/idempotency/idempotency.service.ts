/**
 * [INPUT]: scope + idempotency key + request hash
 * [OUTPUT]: 幂等开始/回放/处理中状态
 * [POS]: 公开写接口的通用幂等基础设施
 */

import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-main/client';
import { PrismaService } from '../prisma/prisma.service';
import { IdempotencyKeyReuseConflictError } from './idempotency.errors';
import type {
  BeginIdempotencyParams,
  BeginIdempotencyResult,
  CompleteIdempotencyParams,
  FailIdempotencyParams,
} from './idempotency.types';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  private toNullableJson(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (value === null || value === undefined) {
      return Prisma.DbNull;
    }
    return value as Prisma.InputJsonValue;
  }

  static hashRequest(payload: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(payload ?? null))
      .digest('hex');
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async resolveExistingRecord(
    params: BeginIdempotencyParams,
  ): Promise<BeginIdempotencyResult> {
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: {
        scope_idempotencyKey: {
          scope: params.scope,
          idempotencyKey: params.idempotencyKey,
        },
      },
    });

    if (!existing) {
      const record = await this.prisma.idempotencyRecord.create({
        data: {
          scope: params.scope,
          idempotencyKey: params.idempotencyKey,
          method: params.method,
          path: params.path,
          requestHash: params.requestHash,
          expiresAt: new Date(Date.now() + params.ttlSeconds * 1000),
        },
        select: { id: true },
      });

      return { kind: 'started', recordId: record.id };
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      const record = await this.prisma.idempotencyRecord.update({
        where: { id: existing.id },
        data: {
          method: params.method,
          path: params.path,
          requestHash: params.requestHash,
          status: 'PROCESSING',
          responseStatus: null,
          responseBody: Prisma.DbNull,
          resourceType: null,
          resourceId: null,
          errorCode: null,
          expiresAt: new Date(Date.now() + params.ttlSeconds * 1000),
        },
        select: { id: true },
      });

      return { kind: 'started', recordId: record.id };
    }

    if (existing.requestHash !== params.requestHash) {
      throw new IdempotencyKeyReuseConflictError();
    }

    if (existing.status === 'PROCESSING') {
      return { kind: 'processing' };
    }

    if (
      existing.status === 'FAILED' &&
      params.retryFailedResponseStatusesGte !== undefined &&
      (existing.responseStatus ?? 500) >= params.retryFailedResponseStatusesGte
    ) {
      const record = await this.prisma.idempotencyRecord.update({
        where: { id: existing.id },
        data: {
          method: params.method,
          path: params.path,
          requestHash: params.requestHash,
          status: 'PROCESSING',
          responseStatus: null,
          responseBody: Prisma.DbNull,
          resourceType: null,
          resourceId: null,
          errorCode: null,
          expiresAt: new Date(Date.now() + params.ttlSeconds * 1000),
        },
        select: { id: true },
      });

      return { kind: 'started', recordId: record.id };
    }

    return {
      kind: 'replay',
      responseStatus: existing.responseStatus ?? 200,
      responseBody: existing.responseBody,
      resourceType: existing.resourceType,
      resourceId: existing.resourceId,
      errorCode: existing.errorCode,
    };
  }

  async begin(params: BeginIdempotencyParams): Promise<BeginIdempotencyResult> {
    try {
      return await this.resolveExistingRecord(params);
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      return this.resolveExistingRecord(params);
    }
  }

  async complete(params: CompleteIdempotencyParams): Promise<void> {
    await this.prisma.idempotencyRecord.update({
      where: { id: params.recordId },
      data: {
        status: 'COMPLETED',
        responseStatus: params.responseStatus,
        responseBody: this.toNullableJson(params.responseBody),
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        errorCode: null,
      },
    });
  }

  async fail(params: FailIdempotencyParams): Promise<void> {
    await this.prisma.idempotencyRecord.update({
      where: { id: params.recordId },
      data: {
        status: 'FAILED',
        responseStatus: params.responseStatus ?? 500,
        responseBody: this.toNullableJson(params.responseBody),
        errorCode: params.errorCode ?? null,
      },
    });
  }
}
