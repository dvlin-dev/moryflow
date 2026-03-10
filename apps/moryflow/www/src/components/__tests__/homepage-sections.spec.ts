import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import {
  HOME_COMPARE_CARDS,
  HOME_COMPARE_MORE,
  HOME_SECTION_ORDER,
} from '../../lib/homepage-sections';
import { HomePageSections } from '../landing/HomePageSections';

function createMockSection(id: string) {
  return function MockSection() {
    return createElement('div', { 'data-home-section': id });
  };
}

vi.mock('../landing/AgentFirstHero', () => ({
  AgentFirstHero: createMockSection('hero'),
}));
vi.mock('../landing/FeaturesSection', () => ({
  FeaturesSection: createMockSection('features'),
}));
vi.mock('../landing/CompareStripSection', () => ({
  CompareStripSection: createMockSection('compare'),
}));
vi.mock('../landing/DownloadCTA', () => ({
  DownloadCTA: createMockSection('download-cta'),
}));

describe('homepage section configuration', () => {
  test('frozen homepage order is hero → features → compare → download-cta', () => {
    expect(HOME_SECTION_ORDER).toEqual(['hero', 'features', 'compare', 'download-cta']);
  });

  test('homepage compare cards expose top 3 by traffic: OpenClaw, Cowork, Obsidian', () => {
    const pageIds = HOME_COMPARE_CARDS.map((c) => c.pageId);
    expect(pageIds).toEqual(['openclaw', 'cowork', 'obsidian']);
  });

  test('homepage compare "more" links include Manus and Notion', () => {
    const moreIds = HOME_COMPARE_MORE.map((m) => m.pageId);
    expect(moreIds).toEqual(['manus', 'notion']);
  });

  test('renders the homepage sections in the frozen order', () => {
    const html = renderToStaticMarkup(createElement(HomePageSections));

    const sectionIds = HOME_SECTION_ORDER.map((sectionId) => `data-home-section="${sectionId}"`);
    const sectionOffsets = sectionIds.map((sectionId) => html.indexOf(sectionId));

    expect(sectionOffsets.every((offset) => offset >= 0)).toBe(true);

    for (let index = 1; index < sectionOffsets.length; index += 1) {
      const currentOffset = sectionOffsets[index];
      const previousOffset = sectionOffsets[index - 1];

      expect(currentOffset).toBeDefined();
      expect(previousOffset).toBeDefined();
      expect(currentOffset as number).toBeGreaterThan(previousOffset as number);
    }
  });
});
