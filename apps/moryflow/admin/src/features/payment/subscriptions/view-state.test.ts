import { describe, expect, it } from 'vitest';
import { resolveSubscriptionsListViewState } from './view-state';

describe('resolveSubscriptionsListViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveSubscriptionsListViewState({
        isLoading: true,
        error: new Error('boom'),
        count: 1,
      })
    ).toBe('loading');
  });

  it('非 loading 且有 error 时返回 error', () => {
    expect(
      resolveSubscriptionsListViewState({
        isLoading: false,
        error: new Error('boom'),
        count: 1,
      })
    ).toBe('error');
  });

  it('无 loading/error 且空列表时返回 empty', () => {
    expect(
      resolveSubscriptionsListViewState({
        isLoading: false,
        error: null,
        count: 0,
      })
    ).toBe('empty');
  });

  it('无 loading/error 且有数据时返回 ready', () => {
    expect(
      resolveSubscriptionsListViewState({
        isLoading: false,
        error: null,
        count: 2,
      })
    ).toBe('ready');
  });
});
