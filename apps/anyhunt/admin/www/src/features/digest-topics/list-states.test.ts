import { describe, expect, it } from 'vitest';
import { resolveAllTopicsListState, resolveFeaturedTopicsListState } from './list-states';

describe('digest topics list states', () => {
  it('should resolve all topics state in priority order', () => {
    expect(resolveAllTopicsListState({ isLoading: true, hasError: true, itemCount: 0 })).toBe(
      'loading'
    );
    expect(resolveAllTopicsListState({ isLoading: false, hasError: true, itemCount: 2 })).toBe(
      'error'
    );
    expect(resolveAllTopicsListState({ isLoading: false, hasError: false, itemCount: 0 })).toBe(
      'empty'
    );
    expect(resolveAllTopicsListState({ isLoading: false, hasError: false, itemCount: 1 })).toBe(
      'ready'
    );
  });

  it('should resolve featured topics state in priority order', () => {
    expect(
      resolveFeaturedTopicsListState({
        isLoading: true,
        hasError: false,
        itemCount: 3,
      })
    ).toBe('loading');
    expect(
      resolveFeaturedTopicsListState({
        isLoading: false,
        hasError: true,
        itemCount: 3,
      })
    ).toBe('error');
    expect(
      resolveFeaturedTopicsListState({
        isLoading: false,
        hasError: false,
        itemCount: 0,
      })
    ).toBe('empty');
    expect(
      resolveFeaturedTopicsListState({
        isLoading: false,
        hasError: false,
        itemCount: 2,
      })
    ).toBe('ready');
  });
});
