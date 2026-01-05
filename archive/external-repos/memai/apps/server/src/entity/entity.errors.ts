/**
 * Entity module custom errors
 *
 * [DEFINES]: EntityError, EntityNotFoundError
 * [USED_BY]: entity.service.ts, entity.controller.ts
 */
import { HttpException, HttpStatus } from '@nestjs/common';

export type EntityErrorCode =
  | 'ENTITY_NOT_FOUND'
  | 'ENTITY_CREATE_FAILED'
  | 'ENTITY_DELETE_FAILED';

export abstract class EntityError extends HttpException {
  constructor(
    public readonly code: EntityErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ success: false, error: { code, message, details } }, status);
  }
}

export class EntityNotFoundError extends EntityError {
  constructor(id: string) {
    super(
      'ENTITY_NOT_FOUND',
      `Entity not found: ${id}`,
      HttpStatus.NOT_FOUND,
      { id },
    );
  }
}

export class EntityCreateFailedError extends EntityError {
  constructor(reason: string) {
    super(
      'ENTITY_CREATE_FAILED',
      `Failed to create entity: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { reason },
    );
  }
}
