/**
 * [INPUT]: Explore topics search-state props
 * [OUTPUT]: rendered markup assertions for create-row visibility
 * [POS]: Explore create-entry regression tests
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExploreTopicsContent } from '../ExploreTopicsContent';

const noop = () => {};

function renderSearchMarkup(overrides?: Partial<React.ComponentProps<typeof ExploreTopicsContent>>): string {
  const props: React.ComponentProps<typeof ExploreTopicsContent> = {
    hasSearch: true,
    createRowLabel: 'Create subscription for "AI Agents"',
    searchTopics: [],
    searchError: null,
    searchLoading: false,
    searchErrorState: false,
    trendingTopics: [],
    trendingError: null,
    trendingLoading: false,
    trendingErrorState: false,
    onOpenCreateDialog: noop,
    onPreviewTopic: noop,
    onFollowTopic: noop,
    ...overrides,
  };

  return renderToStaticMarkup(React.createElement(ExploreTopicsContent, props));
}

describe('ExploreTopicsContent', () => {
  it('keeps create entry visible while search results are loading', () => {
    const html = renderSearchMarkup({ searchLoading: true });
    expect(html).toContain('Create subscription for');
    expect(html).toContain('Create');
  });

  it('keeps create entry visible when search fails', () => {
    const html = renderSearchMarkup({
      searchErrorState: true,
      searchError: new Error('boom'),
    });
    expect(html).toContain('Create subscription for');
    expect(html).toContain('boom');
  });

  it('keeps create entry visible when search returns empty list', () => {
    const html = renderSearchMarkup({
      searchLoading: false,
      searchErrorState: false,
      searchTopics: [],
    });
    expect(html).toContain('Create subscription for');
    expect(html).toContain('No results.');
  });
});
