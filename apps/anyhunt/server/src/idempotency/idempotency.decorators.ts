import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { IDEMPOTENCY_KEY_HEADER } from './idempotency.constants';

function normalizeIdempotencyKey(value: string | string[] | undefined): string {
  const key = Array.isArray(value) ? value[0] : value;
  if (!key || key.trim().length === 0) {
    throw new BadRequestException({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: `${IDEMPOTENCY_KEY_HEADER} header is required`,
    });
  }

  return key.trim();
}

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return normalizeIdempotencyKey(request.headers['idempotency-key']);
  },
);
