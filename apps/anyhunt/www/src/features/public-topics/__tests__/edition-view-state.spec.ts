/**
 * [INPUT]: edition detail loading/error/data state tuples
 * [OUTPUT]: deterministic view-state mapping assertions
 * [POS]: public edition detail stale-content regression tests
 */

import { describe, expect, it } from 'vitest';
import { resolveEditionDetailViewState } from '../edition-view-state';

describe('edition-view-state', () => {
  it('prioritizes loading while fetching a new edition', () => {
    expect(
      resolveEditionDetailViewState({
        isLoading: true,
        hasEdition: true,
        hasError: false,
      })
    ).toBe('loading');
  });

  it('returns error when request is settled but data is unavailable', () => {
    expect(
      resolveEditionDetailViewState({
        isLoading: false,
        hasEdition: false,
        hasError: true,
      })
    ).toBe('error');
  });

  it('returns ready only when settled and data is present', () => {
    expect(
      resolveEditionDetailViewState({
        isLoading: false,
        hasEdition: true,
        hasError: false,
      })
    ).toBe('ready');
  });
});
