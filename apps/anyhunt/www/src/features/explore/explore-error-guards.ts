/**
 * [PROVIDES]: Explore feature error guards for unknown catch values
 * [POS]: Narrowing helpers for API errors (unauthorized/conflict/message)
 */

interface ApiErrorLike {
  status?: number;
  isUnauthorized?: boolean;
  message?: string;
}

function toApiErrorLike(error: unknown): ApiErrorLike | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  return error as ApiErrorLike;
}

export function isUnauthorizedApiError(error: unknown): boolean {
  const candidate = toApiErrorLike(error);
  if (!candidate) {
    return false;
  }

  return candidate.isUnauthorized === true || candidate.status === 401;
}

export function isConflictApiError(error: unknown): boolean {
  const candidate = toApiErrorLike(error);
  if (!candidate) {
    return false;
  }

  return candidate.status === 409;
}

export function getErrorMessageOrFallback(error: unknown, fallback: string): string {
  const candidate = toApiErrorLike(error);
  if (!candidate || !candidate.message) {
    return fallback;
  }

  return candidate.message;
}
