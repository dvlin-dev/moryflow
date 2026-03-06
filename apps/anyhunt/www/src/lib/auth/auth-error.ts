/**
 * [PROVIDES]: auth error normalization helpers
 * [POS]: auth network layer error shape guards and fallback message resolver
 */

interface ErrorRecord {
  message?: unknown;
  status?: unknown;
}

function asErrorRecord(error: unknown): ErrorRecord | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  return error as ErrorRecord;
}

export function resolveErrorStatus(error: unknown): number | null {
  const record = asErrorRecord(error);
  if (!record || typeof record.status !== 'number') {
    return null;
  }
  return record.status;
}

export function isUnauthorizedLikeError(error: unknown): boolean {
  const status = resolveErrorStatus(error);
  return status === 401 || status === 403;
}

export function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const record = asErrorRecord(error);
  if (record && typeof record.message === 'string' && record.message.trim()) {
    return record.message;
  }

  return fallback;
}
