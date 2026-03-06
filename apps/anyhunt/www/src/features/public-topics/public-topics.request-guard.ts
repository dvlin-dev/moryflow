/**
 * [PROVIDES]: async request generation guard for public topics hooks
 * [POS]: prevent stale async responses from overriding latest state
 */

export interface PaginationLoadState {
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  page: number;
  totalPages: number;
}

export interface RequestGenerationGuard {
  next: () => number;
  current: () => number;
  isCurrent: (generation: number) => boolean;
}

export function createRequestGenerationGuard(initialGeneration = 0): RequestGenerationGuard {
  let activeGeneration = initialGeneration;

  return {
    next: () => {
      activeGeneration += 1;
      return activeGeneration;
    },
    current: () => activeGeneration,
    isCurrent: (generation) => generation === activeGeneration,
  };
}

export function shouldSkipPaginationLoad(state: PaginationLoadState): boolean {
  if (state.isInitialLoading) return true;
  if (state.isLoadingMore) return true;
  if (state.page >= state.totalPages) return true;
  return false;
}

export function isAbortRequestError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { name?: unknown };
  return candidate.name === 'AbortError';
}
