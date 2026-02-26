/**
 * [INPUT]: Explore topics search-state model/actions
 * [OUTPUT]: rendered markup assertions for create-row visibility
 * [POS]: Explore create-entry regression tests
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ExploreTopicsContent,
  type ExploreTopicsContentActions,
  type ExploreTopicsContentModel,
} from '../ExploreTopicsContent';

const noop = () => {};

interface RenderSearchOverrides {
  mode?: ExploreTopicsContentModel['mode'];
  createRowLabel?: string | null;
  search?: Partial<ExploreTopicsContentModel['search']>;
  trending?: Partial<ExploreTopicsContentModel['trending']>;
}

function renderSearchMarkup(overrides?: RenderSearchOverrides): string {
  const model: ExploreTopicsContentModel = {
    mode: overrides?.mode ?? 'search',
    createRowLabel: overrides?.createRowLabel ?? 'Create subscription for "AI Agents"',
    search: {
      topics: [],
      error: null,
      isLoading: false,
      isError: false,
      ...overrides?.search,
    },
    trending: {
      topics: [],
      error: null,
      isLoading: false,
      isError: false,
      ...overrides?.trending,
    },
  };

  const actions: ExploreTopicsContentActions = {
    onOpenCreateDialog: noop,
    onPreviewTopic: noop,
    onFollowTopic: noop,
  };

  return renderToStaticMarkup(React.createElement(ExploreTopicsContent, { model, actions }));
}

describe('ExploreTopicsContent', () => {
  it('keeps create entry visible while search results are loading', () => {
    const html = renderSearchMarkup({ search: { isLoading: true } });
    expect(html).toContain('Create subscription for');
    expect(html).toContain('Create');
  });

  it('keeps create entry visible when search fails', () => {
    const html = renderSearchMarkup({
      search: {
        isError: true,
        error: new Error('boom'),
      },
    });
    expect(html).toContain('Create subscription for');
    expect(html).toContain('boom');
  });

  it('keeps create entry visible when search returns empty list', () => {
    const html = renderSearchMarkup({
      search: {
        isLoading: false,
        isError: false,
        topics: [],
      },
    });
    expect(html).toContain('Create subscription for');
    expect(html).toContain('No results.');
  });
});
