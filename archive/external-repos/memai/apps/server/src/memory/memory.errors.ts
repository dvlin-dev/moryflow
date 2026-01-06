/**
 * Memory module custom errors
 *
 * [DEFINES]: MemoryError, MemoryNotFoundError, MemoryLimitExceededError
 * [USED_BY]: memory.service.ts, memory.controller.ts
 */
import { HttpException, HttpStatus } from '@nestjs/common';

export type MemoryErrorCode =
  | 'MEMORY_NOT_FOUND'
  | 'MEMORY_CREATE_FAILED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'MEMORY_SEARCH_FAILED'
  | 'MEMORY_DELETE_FAILED';

export abstract class MemoryError extends HttpException {
  constructor(
    public readonly code: MemoryErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ success: false, error: { code, message, details } }, status);
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super(
      'MEMORY_NOT_FOUND',
      `Memory not found: ${id}`,
      HttpStatus.NOT_FOUND,
      { id },
    );
  }
}

export class MemoryLimitExceededError extends MemoryError {
  constructor(limit: number, current: number) {
    super(
      'MEMORY_LIMIT_EXCEEDED',
      'Memory limit exceeded',
      HttpStatus.FORBIDDEN,
      { limit, current },
    );
  }
}

export class MemoryCreateFailedError extends MemoryError {
  constructor(reason: string) {
    super(
      'MEMORY_CREATE_FAILED',
      `Failed to create memory: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { reason },
    );
  }
}

export class MemorySearchFailedError extends MemoryError {
  constructor(reason: string) {
    super(
      'MEMORY_SEARCH_FAILED',
      `Memory search failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { reason },
    );
  }
}
