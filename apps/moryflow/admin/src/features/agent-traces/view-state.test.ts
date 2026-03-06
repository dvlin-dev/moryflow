import { describe, expect, it } from 'vitest';
import { resolveAgentTraceListViewState, resolveTraceDetailViewState } from './view-state';

describe('resolveAgentTraceListViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveAgentTraceListViewState({
        isLoading: true,
        error: new Error('boom'),
        count: 2,
      })
    ).toBe('loading');
  });

  it('非 loading 且 error 时返回 error', () => {
    expect(
      resolveAgentTraceListViewState({
        isLoading: false,
        error: new Error('boom'),
        count: 2,
      })
    ).toBe('error');
  });

  it('无 loading/error 且空列表时返回 empty', () => {
    expect(
      resolveAgentTraceListViewState({
        isLoading: false,
        error: null,
        count: 0,
      })
    ).toBe('empty');
  });

  it('无 loading/error 且有数据时返回 ready', () => {
    expect(
      resolveAgentTraceListViewState({
        isLoading: false,
        error: null,
        count: 1,
      })
    ).toBe('ready');
  });
});

describe('resolveTraceDetailViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveTraceDetailViewState({
        isLoading: true,
        error: new Error('boom'),
        hasTrace: true,
      })
    ).toBe('loading');
  });

  it('非 loading 且 error 时返回 error', () => {
    expect(
      resolveTraceDetailViewState({
        isLoading: false,
        error: new Error('boom'),
        hasTrace: true,
      })
    ).toBe('error');
  });

  it('无 loading/error 且 trace 缺失时返回 empty', () => {
    expect(
      resolveTraceDetailViewState({
        isLoading: false,
        error: null,
        hasTrace: false,
      })
    ).toBe('empty');
  });

  it('无 loading/error 且 trace 存在时返回 ready', () => {
    expect(
      resolveTraceDetailViewState({
        isLoading: false,
        error: null,
        hasTrace: true,
      })
    ).toBe('ready');
  });
});
