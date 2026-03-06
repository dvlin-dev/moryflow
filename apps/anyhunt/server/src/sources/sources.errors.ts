/**
 * [INPUT]: Sources domain guardrail / lifecycle violations
 * [OUTPUT]: RFC7807-compatible HttpException payloads
 * [POS]: Sources 模块公开错误契约
 */

import { HttpException, HttpStatus } from '@nestjs/common';

type SourceGuardrailName =
  | 'max_source_bytes'
  | 'max_normalized_tokens_per_revision'
  | 'max_chunks_per_revision'
  | 'max_finalize_requests_per_api_key_per_window'
  | 'max_reindex_per_source_per_window'
  | 'max_concurrent_source_jobs_per_api_key';

interface SourceGuardrailDetails {
  guardrail: SourceGuardrailName;
  limit: number;
  current: number;
  retryAfter?: number;
}

interface SourceUploadWindowExpiredDetails {
  expiredAt: string;
}

class SourceProblemException extends HttpException {
  constructor(
    status: number,
    code: string,
    message: string,
    details?: SourceGuardrailDetails | SourceUploadWindowExpiredDetails,
  ) {
    super(
      {
        code,
        message,
        ...(details ? { details } : {}),
      },
      status,
    );
  }
}

export function createSourceSizeLimitExceeded(params: {
  limit: number;
  current: number;
}) {
  return new SourceProblemException(
    HttpStatus.PAYLOAD_TOO_LARGE,
    'SOURCE_SIZE_LIMIT_EXCEEDED',
    'Source bytes exceed configured limit',
    {
      guardrail: 'max_source_bytes',
      limit: params.limit,
      current: params.current,
    },
  );
}

export function createSourceTokenLimitExceeded(params: {
  limit: number;
  current: number;
}) {
  return new SourceProblemException(
    HttpStatus.PAYLOAD_TOO_LARGE,
    'SOURCE_TOKEN_LIMIT_EXCEEDED',
    'Source tokens exceed configured limit',
    {
      guardrail: 'max_normalized_tokens_per_revision',
      limit: params.limit,
      current: params.current,
    },
  );
}

export function createSourceChunkLimitExceeded(params: {
  limit: number;
  current: number;
}) {
  return new SourceProblemException(
    HttpStatus.PAYLOAD_TOO_LARGE,
    'SOURCE_CHUNK_LIMIT_EXCEEDED',
    'Chunk count exceeds configured limit',
    {
      guardrail: 'max_chunks_per_revision',
      limit: params.limit,
      current: params.current,
    },
  );
}

export function createFinalizeRateLimitExceeded(params: {
  limit: number;
  current: number;
  retryAfter: number;
}) {
  return new SourceProblemException(
    HttpStatus.TOO_MANY_REQUESTS,
    'FINALIZE_RATE_LIMIT_EXCEEDED',
    'Finalize request rate limit exceeded',
    {
      guardrail: 'max_finalize_requests_per_api_key_per_window',
      limit: params.limit,
      current: params.current,
      retryAfter: params.retryAfter,
    },
  );
}

export function createReindexRateLimitExceeded(params: {
  limit: number;
  current: number;
  retryAfter: number;
}) {
  return new SourceProblemException(
    HttpStatus.TOO_MANY_REQUESTS,
    'REINDEX_RATE_LIMIT_EXCEEDED',
    'Reindex request rate limit exceeded',
    {
      guardrail: 'max_reindex_per_source_per_window',
      limit: params.limit,
      current: params.current,
      retryAfter: params.retryAfter,
    },
  );
}

export function createConcurrentProcessingLimitExceeded(params: {
  limit: number;
  current: number;
  retryAfter: number;
}) {
  return new SourceProblemException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'CONCURRENT_PROCESSING_LIMIT_EXCEEDED',
    'Concurrent source processing limit exceeded',
    {
      guardrail: 'max_concurrent_source_jobs_per_api_key',
      limit: params.limit,
      current: params.current,
      retryAfter: params.retryAfter,
    },
  );
}

export function createSourceUploadWindowExpired(expiredAt: Date) {
  return new SourceProblemException(
    HttpStatus.CONFLICT,
    'SOURCE_UPLOAD_WINDOW_EXPIRED',
    'Source upload window expired',
    {
      expiredAt: expiredAt.toISOString(),
    },
  );
}
