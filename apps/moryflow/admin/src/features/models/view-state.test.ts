import { describe, expect, it } from 'vitest';
import { resolveModelsListViewState } from './view-state';

describe('resolveModelsListViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveModelsListViewState({
        isLoading: true,
        error: new Error('boom'),
        count: 10,
      })
    ).toBe('loading');
  });

  it('非 loading 且有 error 时返回 error', () => {
    expect(
      resolveModelsListViewState({
        isLoading: false,
        error: new Error('boom'),
        count: 10,
      })
    ).toBe('error');
  });

  it('无 loading/error 且 count=0 时返回 empty', () => {
    expect(
      resolveModelsListViewState({
        isLoading: false,
        error: null,
        count: 0,
      })
    ).toBe('empty');
  });

  it('无 loading/error 且有数据时返回 ready', () => {
    expect(
      resolveModelsListViewState({
        isLoading: false,
        error: null,
        count: 2,
      })
    ).toBe('ready');
  });
});
