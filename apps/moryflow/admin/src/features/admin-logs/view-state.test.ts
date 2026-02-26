import { describe, expect, it } from 'vitest';
import { resolveActivityLogsListViewState } from './view-state';

describe('resolveActivityLogsListViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveActivityLogsListViewState({
        isLoading: true,
        error: new Error('boom'),
        count: 2,
      })
    ).toBe('loading');
  });

  it('非 loading 且 error 时返回 error', () => {
    expect(
      resolveActivityLogsListViewState({
        isLoading: false,
        error: new Error('boom'),
        count: 2,
      })
    ).toBe('error');
  });

  it('无 loading/error 且空列表时返回 empty', () => {
    expect(
      resolveActivityLogsListViewState({
        isLoading: false,
        error: null,
        count: 0,
      })
    ).toBe('empty');
  });

  it('无 loading/error 且有数据时返回 ready', () => {
    expect(
      resolveActivityLogsListViewState({
        isLoading: false,
        error: null,
        count: 1,
      })
    ).toBe('ready');
  });
});
