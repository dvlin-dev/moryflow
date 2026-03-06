import { describe, expect, it } from 'vitest';
import { resolveSiteDetailViewState, resolveSitesListViewState } from './view-state';

describe('resolveSitesListViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveSitesListViewState({
        isLoading: true,
        error: new Error('boom'),
        count: 3,
      })
    ).toBe('loading');
  });

  it('error 次高优先级', () => {
    expect(
      resolveSitesListViewState({
        isLoading: false,
        error: new Error('boom'),
        count: 3,
      })
    ).toBe('error');
  });

  it('无 loading/error 且 count=0 时为 empty', () => {
    expect(
      resolveSitesListViewState({
        isLoading: false,
        error: null,
        count: 0,
      })
    ).toBe('empty');
  });

  it('无 loading/error 且 count>0 时为 ready', () => {
    expect(
      resolveSitesListViewState({
        isLoading: false,
        error: null,
        count: 1,
      })
    ).toBe('ready');
  });
});

describe('resolveSiteDetailViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveSiteDetailViewState({
        isLoading: true,
        error: new Error('boom'),
        hasSite: true,
      })
    ).toBe('loading');
  });

  it('非 loading 且 error 时为 error', () => {
    expect(
      resolveSiteDetailViewState({
        isLoading: false,
        error: new Error('boom'),
        hasSite: true,
      })
    ).toBe('error');
  });

  it('无 loading/error 且无站点时为 not-found', () => {
    expect(
      resolveSiteDetailViewState({
        isLoading: false,
        error: null,
        hasSite: false,
      })
    ).toBe('not-found');
  });

  it('无 loading/error 且有站点时为 ready', () => {
    expect(
      resolveSiteDetailViewState({
        isLoading: false,
        error: null,
        hasSite: true,
      })
    ).toBe('ready');
  });
});
