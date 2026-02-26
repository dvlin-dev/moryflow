import { describe, expect, it } from 'vitest';
import { resolveOrdersListViewState } from './view-state';

describe('resolveOrdersListViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveOrdersListViewState({
        isLoading: true,
        error: new Error('boom'),
        count: 3,
      })
    ).toBe('loading');
  });

  it('非 loading 且有 error 时返回 error', () => {
    expect(
      resolveOrdersListViewState({
        isLoading: false,
        error: new Error('boom'),
        count: 3,
      })
    ).toBe('error');
  });

  it('无 loading/error 且空列表时返回 empty', () => {
    expect(
      resolveOrdersListViewState({
        isLoading: false,
        error: null,
        count: 0,
      })
    ).toBe('empty');
  });

  it('无 loading/error 且有数据时返回 ready', () => {
    expect(
      resolveOrdersListViewState({
        isLoading: false,
        error: null,
        count: 1,
      })
    ).toBe('ready');
  });
});
