/**
 * [INPUT]: 幂等 scope + request metadata + handler
 * [OUTPUT]: 首次执行结果 / 缓存回放 / 一致性错误
 * [POS]: 公开写接口的通用幂等编排层
 */

import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyRequestInProgressError } from './idempotency.errors';

const CONFLICT_STATUS = 409;

export interface IdempotencyResponseDescriptor {
  resourceType?: string;
  resourceId?: string;
}

export interface ExecuteIdempotentRequestOptions<TResponse> {
  scope: string;
  idempotencyKey: string;
  method: string;
  path: string;
  requestBody: unknown;
  ttlSeconds: number;
  responseStatus: number;
  execute: () => Promise<TResponse>;
  describeResponse?: (response: TResponse) => IdempotencyResponseDescriptor;
}

@Injectable()
export class IdempotencyExecutorService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  private normalizeReplayError(status: number, body: unknown): HttpException {
    if (body instanceof HttpException) {
      return body;
    }

    if (status === CONFLICT_STATUS) {
      return new ConflictException(
        body ?? {
          code: 'CONFLICT',
          message: 'Request replay returned a conflict response',
        },
      );
    }

    return new HttpException(
      body ?? {
        code: status === CONFLICT_STATUS ? 'CONFLICT' : 'REQUEST_REPLAY_FAILED',
        message: 'Request replay returned an error response',
      },
      status,
    );
  }

  private normalizeFailure(error: unknown): {
    responseStatus: number;
    responseBody: unknown;
    errorCode?: string;
  } {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const source =
        typeof response === 'object' && response !== null
          ? (response as Record<string, unknown>)
          : undefined;

      return {
        responseStatus: error.getStatus(),
        responseBody: response,
        errorCode: typeof source?.code === 'string' ? source.code : undefined,
      };
    }

    if (error instanceof Error) {
      return {
        responseStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        responseBody: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
        errorCode: 'INTERNAL_ERROR',
      };
    }

    const fallback = new InternalServerErrorException({
      code: 'INTERNAL_ERROR',
      message: 'Unhandled request failure',
    });

    return {
      responseStatus: fallback.getStatus(),
      responseBody: fallback.getResponse(),
      errorCode: 'INTERNAL_ERROR',
    };
  }

  async execute<TResponse>(
    options: ExecuteIdempotentRequestOptions<TResponse>,
  ): Promise<TResponse> {
    const beginResult = await this.idempotencyService.begin({
      scope: options.scope,
      idempotencyKey: options.idempotencyKey,
      method: options.method,
      path: options.path,
      requestHash: IdempotencyService.hashRequest(options.requestBody),
      ttlSeconds: options.ttlSeconds,
    });

    if (beginResult.kind === 'replay') {
      if (beginResult.responseStatus >= 400) {
        throw this.normalizeReplayError(
          beginResult.responseStatus,
          beginResult.responseBody,
        );
      }

      return beginResult.responseBody as TResponse;
    }

    if (beginResult.kind === 'processing') {
      throw new IdempotencyRequestInProgressError();
    }

    try {
      const response = await options.execute();
      const resource = options.describeResponse?.(response);

      await this.idempotencyService.complete({
        recordId: beginResult.recordId,
        responseStatus: options.responseStatus,
        responseBody: response,
        resourceType: resource?.resourceType,
        resourceId: resource?.resourceId,
      });

      return response;
    } catch (error) {
      const failure = this.normalizeFailure(error);
      await this.idempotencyService.fail({
        recordId: beginResult.recordId,
        responseStatus: failure.responseStatus,
        responseBody: failure.responseBody,
        errorCode: failure.errorCode,
      });
      throw error;
    }
  }
}
