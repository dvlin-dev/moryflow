/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentFirstHero } from '../AgentFirstHero';

let mockLocale = 'en';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: ReactNode;
    to: string;
  } & Record<string, unknown>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/routes/{-$locale}/route', () => ({
  useLocale: () => mockLocale,
}));

vi.mock('@/lib/platform', () => ({
  usePlatformDetection: () => 'mac',
}));

vi.mock('@/hooks/useGitHubStars', () => ({
  useGitHubStars: () => 42,
  formatStarCount: (count: number) => String(count),
}));

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ current: null }),
  useScrollRevealGroup: () => ({ current: null }),
}));

describe('AgentFirstHero', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('min-width'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    mockLocale = 'en';
    cleanup();
  });

  it('renders the two-line title with accent styling', () => {
    render(<AgentFirstHero />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByText('Your AI agents')).toBeTruthy();
    expect(screen.getByText('your knowledge')).toBeTruthy();
  });

  it('renders the macOS download CTA', () => {
    render(<AgentFirstHero />);
    expect(screen.getByRole('link', { name: /download for macos/i })).toBeTruthy();
  });

  it('renders the GitHub Star link with count', () => {
    render(<AgentFirstHero />);
    expect(screen.getByText('Star on GitHub')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('renders the "Free to start" tagline', () => {
    const markup = renderToStaticMarkup(<AgentFirstHero />);
    expect(markup).toContain('Free to start');
    expect(markup).toContain('Open Source');
  });

  it('localizes the title for zh locale', () => {
    mockLocale = 'zh';
    render(<AgentFirstHero />);
    expect(screen.getByText('你的 AI 智能体')).toBeTruthy();
    expect(screen.getByText('你的知识')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<AgentFirstHero />);
    expect(
      screen.getByText(/local-first workspace where AI agents work with your notes/i)
    ).toBeTruthy();
  });
});
