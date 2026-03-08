import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import {
  HOME_COMPARE_PAGE_IDS,
  HOME_SECTION_ORDER,
  HOME_TELEGRAM_POINT_KEYS,
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
vi.mock('../landing/CorePillarsSection', () => ({
  CorePillarsSection: createMockSection('pillars'),
}));
vi.mock('../landing/WorkflowLoopSection', () => ({
  WorkflowLoopSection: createMockSection('workflow'),
}));
vi.mock('../landing/UseCasesSection', () => ({
  UseCasesSection: createMockSection('use-cases'),
}));
vi.mock('../landing/TelegramAgentSection', () => ({
  TelegramAgentSection: createMockSection('telegram'),
}));
vi.mock('../landing/CompareStripSection', () => ({
  CompareStripSection: createMockSection('compare'),
}));
vi.mock('../landing/PublishingSection', () => ({
  PublishingSection: createMockSection('publishing'),
}));
vi.mock('../landing/SocialProofSection', () => ({
  SocialProofSection: createMockSection('social-proof'),
}));
vi.mock('../landing/DownloadCTA', () => ({
  DownloadCTA: createMockSection('download-cta'),
}));

describe('homepage section configuration', () => {
  test('keeps compare ahead of publishing in the frozen homepage order', () => {
    expect(HOME_SECTION_ORDER).toEqual([
      'hero',
      'pillars',
      'workflow',
      'use-cases',
      'telegram',
      'compare',
      'publishing',
      'social-proof',
      'download-cta',
    ]);
  });

  test('highlights only notion, obsidian, and openclaw in homepage compare cards', () => {
    expect(HOME_COMPARE_PAGE_IDS).toEqual(['notion', 'obsidian', 'openclaw']);
  });

  test('defines the three Telegram value points for the homepage section', () => {
    expect(HOME_TELEGRAM_POINT_KEYS).toEqual([
      'home.telegram.pointChat',
      'home.telegram.pointGrounded',
      'home.telegram.pointCapture',
    ]);
  });

  test('renders the homepage sections in the frozen order with hero and pillars intact', () => {
    const html = renderToStaticMarkup(createElement(HomePageSections));

    expect(html).toContain('data-home-section="hero"');
    expect(html).toContain('data-home-section="pillars"');

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
