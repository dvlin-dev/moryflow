/**
 * Relation module custom errors
 *
 * [DEFINES]: RelationError, RelationNotFoundError
 * [USED_BY]: relation.service.ts, relation.controller.ts
 */
import { HttpException, HttpStatus } from '@nestjs/common';

export type RelationErrorCode =
  | 'RELATION_NOT_FOUND'
  | 'RELATION_CREATE_FAILED'
  | 'RELATION_DELETE_FAILED'
  | 'INVALID_ENTITY_REFERENCE';

export abstract class RelationError extends HttpException {
  constructor(
    public readonly code: RelationErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ success: false, error: { code, message, details } }, status);
  }
}

export class RelationNotFoundError extends RelationError {
  constructor(id: string) {
    super(
      'RELATION_NOT_FOUND',
      `Relation not found: ${id}`,
      HttpStatus.NOT_FOUND,
      { id },
    );
  }
}

export class InvalidEntityReferenceError extends RelationError {
  constructor(entityId: string, field: 'sourceId' | 'targetId') {
    super(
      'INVALID_ENTITY_REFERENCE',
      `Invalid entity reference: ${entityId}`,
      HttpStatus.BAD_REQUEST,
      { entityId, field },
    );
  }
}

export class RelationCreateFailedError extends RelationError {
  constructor(reason: string) {
    super(
      'RELATION_CREATE_FAILED',
      `Failed to create relation: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { reason },
    );
  }
}
