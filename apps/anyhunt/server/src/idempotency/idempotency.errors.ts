import { ConflictException } from '@nestjs/common';

export class IdempotencyKeyReuseConflictError extends ConflictException {
  constructor() {
    super({
      code: 'IDEMPOTENCY_KEY_REUSE_CONFLICT',
      message: 'Idempotency key reuse with different request payload',
    });
  }
}

export class IdempotencyRequestInProgressError extends ConflictException {
  constructor() {
    super({
      code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
      message:
        'Another request with the same Idempotency-Key is still processing',
    });
  }
}
