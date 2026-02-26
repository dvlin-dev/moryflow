/**
 * [INPUT]: ScrapeResultResponse
 * [OUTPUT]: ScrapeResultViewModel
 * [POS]: Scrape 结果展示的状态归一化与默认 Tab 计算
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ScrapeResultResponse } from '@/features/playground-shared';

export type ScrapeResultTab = 'screenshot' | 'markdown' | 'html' | 'rawHtml' | 'links' | 'pdf';

export interface ScrapeResultViewModel {
  hasScreenshot: boolean;
  hasPdf: boolean;
  hasMarkdown: boolean;
  hasHtml: boolean;
  hasRawHtml: boolean;
  hasLinks: boolean;
  screenshotSrc?: string;
  defaultTab: ScrapeResultTab;
}

function resolveScreenshotSource(data: ScrapeResultResponse): string | undefined {
  if (!data.screenshot) {
    return undefined;
  }

  if (data.screenshot.base64) {
    const format = data.screenshot.format || 'png';
    return `data:image/${format};base64,${data.screenshot.base64}`;
  }

  return data.screenshot.url;
}

function resolveDefaultTab(viewModel: Omit<ScrapeResultViewModel, 'defaultTab'>): ScrapeResultTab {
  if (viewModel.hasScreenshot) {
    return 'screenshot';
  }

  if (viewModel.hasMarkdown) {
    return 'markdown';
  }

  if (viewModel.hasHtml) {
    return 'html';
  }

  if (viewModel.hasRawHtml) {
    return 'rawHtml';
  }

  if (viewModel.hasLinks) {
    return 'links';
  }

  if (viewModel.hasPdf) {
    return 'pdf';
  }

  return 'html';
}

export function buildScrapeResultViewModel(data: ScrapeResultResponse): ScrapeResultViewModel {
  const hasScreenshot = Boolean(data.screenshot?.url || data.screenshot?.base64);
  const hasPdf = Boolean(data.pdf?.url || data.pdf?.base64);
  const hasMarkdown = Boolean(data.markdown);
  const hasHtml = Boolean(data.html);
  const hasRawHtml = Boolean(data.rawHtml);
  const hasLinks = Boolean(data.links && data.links.length > 0);

  const baseViewModel = {
    hasScreenshot,
    hasPdf,
    hasMarkdown,
    hasHtml,
    hasRawHtml,
    hasLinks,
    screenshotSrc: resolveScreenshotSource(data),
  };

  return {
    ...baseViewModel,
    defaultTab: resolveDefaultTab(baseViewModel),
  };
}
