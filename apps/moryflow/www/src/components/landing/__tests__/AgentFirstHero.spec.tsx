/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('renders the default completed workspace demo state', async () => {
    render(<AgentFirstHero />);

    await screen.findByText('Please introduce Moryflow.');
    expect(screen.getByRole('heading', { name: /your ai agents, your knowledge/i })).toBeTruthy();
    expect(screen.getAllByText('Introducing Moryflow.md')).toHaveLength(2);
    expect(screen.getByText('Please introduce Moryflow.')).toBeTruthy();
    expect(screen.getByText('Searching the web for product positioning')).toBeTruthy();
    expect(screen.getByText(/moryflow is a local-first ai workspace/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /download for macos/i })).toBeTruthy();
  });

  it('renders a desktop workspace preview during server rendering', () => {
    const originalMatchMedia = window.matchMedia;
    // Simulate server rendering so the hero falls back to the SSR preview path.
    // @ts-expect-error test shim
    window.matchMedia = undefined;
    const markup = renderToStaticMarkup(<AgentFirstHero />);
    window.matchMedia = originalMatchMedia;

    expect(markup).toContain('Introducing Moryflow.md');
    expect(markup).toContain('Please introduce Moryflow.');
    expect(markup).toContain('Chat preview');
  });

  it('localizes the workspace demo copy for zh locale', async () => {
    mockLocale = 'zh';

    const markup = renderToStaticMarkup(<AgentFirstHero />);
    expect(markup).toContain('介绍 Moryflow.md');
    expect(markup).toContain('请介绍一下 Moryflow。');

    render(<AgentFirstHero />);

    await screen.findByText('请介绍一下 Moryflow。');
    expect(screen.getAllByText('介绍 Moryflow.md')).toHaveLength(2);
    expect(screen.getByText('联网搜索产品定位')).toBeTruthy();
  });

  it('does not mount the workspace demo when the viewport is below desktop', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<AgentFirstHero />);

    expect(screen.queryByText('Please introduce Moryflow.')).toBeNull();
    await waitFor(() => {
      expect(screen.queryByText('Please introduce Moryflow.')).toBeNull();
    });
    expect(screen.queryByLabelText('Chat message')).toBeNull();
    expect(screen.getByRole('link', { name: /download for macos/i })).toBeTruthy();
  });

  it('appends the fixed assistant reply after sending a new message', async () => {
    render(<AgentFirstHero />);

    await screen.findByLabelText('Chat message');
    fireEvent.change(screen.getByRole('textbox', { name: /chat message/i }), {
      target: { value: 'Can you help me write a landing page?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.getByText('Can you help me write a landing page?')).toBeTruthy();
    expect(
      screen.getByText(
        'This is a simulated demo on the website. Please download Moryflow to experience the real interactive workspace.'
      )
    ).toBeTruthy();
  });
});
