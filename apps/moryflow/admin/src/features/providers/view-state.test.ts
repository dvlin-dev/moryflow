import { describe, expect, it } from 'vitest';
import { resolveProvidersViewState } from './view-state';

describe('resolveProvidersViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveProvidersViewState({
        isLoading: true,
        error: new Error('boom'),
        count: 1,
      })
    ).toBe('loading');
  });

  it('非 loading 且有 error 时返回 error', () => {
    expect(
      resolveProvidersViewState({
        isLoading: false,
        error: new Error('boom'),
        count: 1,
      })
    ).toBe('error');
  });

  it('无 loading/error 且空列表时返回 empty', () => {
    expect(
      resolveProvidersViewState({
        isLoading: false,
        error: null,
        count: 0,
      })
    ).toBe('empty');
  });

  it('无 loading/error 且有数据时返回 ready', () => {
    expect(
      resolveProvidersViewState({
        isLoading: false,
        error: null,
        count: 3,
      })
    ).toBe('ready');
  });
});
