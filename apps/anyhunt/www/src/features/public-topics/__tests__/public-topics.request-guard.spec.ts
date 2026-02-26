/**
 * [INPUT]: request generation and pagination load states
 * [OUTPUT]: stale-request guard behavior assertions
 * [POS]: public topics async request boundary regression tests
 */

import { describe, expect, it } from 'vitest';
import {
  createRequestGenerationGuard,
  isAbortRequestError,
  shouldSkipPaginationLoad,
} from '../public-topics.request-guard';

describe('public-topics request guard', () => {
  it('invalidates stale generations when a new request starts', () => {
    const guard = createRequestGenerationGuard();

    const first = guard.next();
    expect(guard.isCurrent(first)).toBe(true);

    const second = guard.next();
    expect(second).toBe(first + 1);
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it('blocks pagination load when request should be skipped', () => {
    expect(
      shouldSkipPaginationLoad({ isInitialLoading: true, isLoadingMore: false, page: 1, totalPages: 3 })
    ).toBe(true);
    expect(
      shouldSkipPaginationLoad({ isInitialLoading: false, isLoadingMore: true, page: 1, totalPages: 3 })
    ).toBe(true);
    expect(
      shouldSkipPaginationLoad({ isInitialLoading: false, isLoadingMore: false, page: 3, totalPages: 3 })
    ).toBe(true);
    expect(
      shouldSkipPaginationLoad({ isInitialLoading: false, isLoadingMore: false, page: 1, totalPages: 3 })
    ).toBe(false);
  });

  it('detects abort-like errors by name', () => {
    expect(isAbortRequestError({ name: 'AbortError' })).toBe(true);
    expect(isAbortRequestError(new Error('network'))).toBe(false);
    expect(isAbortRequestError(null)).toBe(false);
  });
});
