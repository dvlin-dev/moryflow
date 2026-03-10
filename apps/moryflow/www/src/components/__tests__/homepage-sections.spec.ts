import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import {
  HOME_COMPARE_FEATURES,
  HOME_COMPARE_INDEX,
  HOME_COMPARE_PRODUCTS,
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
vi.mock('../landing/TrustStrip', () => ({
  TrustStrip: createMockSection('trust-strip'),
}));
vi.mock('../landing/FeatureAgents', () => ({
  FeatureAgents: createMockSection('feature-agents'),
}));
vi.mock('../landing/FeatureLocal', () => ({
  FeatureLocal: createMockSection('feature-local'),
}));
vi.mock('../landing/FeaturePublish', () => ({
  FeaturePublish: createMockSection('feature-publish'),
}));
vi.mock('../landing/CompareStripSection', () => ({
  CompareStripSection: createMockSection('compare'),
}));
vi.mock('../landing/DownloadCTA', () => ({
  DownloadCTA: createMockSection('download-cta'),
}));

describe('homepage section configuration', () => {
  test('frozen homepage order is hero → trust-strip → feature-agents → feature-local → feature-publish → compare → download-cta', () => {
    expect(HOME_SECTION_ORDER).toEqual([
      'hero',
      'trust-strip',
      'feature-agents',
      'feature-local',
      'feature-publish',
      'compare',
      'download-cta',
    ]);
  });

  test('HOME_COMPARE_INDEX contains 5 products in correct order', () => {
    const ids = HOME_COMPARE_INDEX.map((c) => c.id);
    expect(ids).toEqual(['openclaw', 'cowork', 'obsidian', 'manus', 'notion']);
  });

  test('HOME_COMPARE_PRODUCTS first entry is Moryflow with isSelf: true', () => {
    const first = HOME_COMPARE_PRODUCTS[0];
    expect(first?.id).toBe('moryflow');
    expect(first?.isSelf).toBe(true);
  });

  test('HOME_COMPARE_FEATURES has 9 dimensions', () => {
    expect(HOME_COMPARE_FEATURES).toHaveLength(9);
  });

  test('Moryflow product has all feature values set to true', () => {
    const moryflow = HOME_COMPARE_PRODUCTS.find((p) => p.id === 'moryflow');
    expect(moryflow).toBeDefined();
    for (const feat of HOME_COMPARE_FEATURES) {
      expect(moryflow!.values[feat.key]).toBe(true);
    }
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
