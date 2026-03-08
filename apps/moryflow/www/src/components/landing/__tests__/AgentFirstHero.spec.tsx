/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentFirstHero } from '../AgentFirstHero';

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
  useLocale: () => 'en',
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
    cleanup();
  });

  it('renders the default completed workspace demo state', () => {
    render(<AgentFirstHero />);

    expect(screen.getByRole('heading', { name: /your ai agents, your knowledge/i })).toBeTruthy();
    expect(screen.getAllByText('Introducing Moryflow.md')).toHaveLength(2);
    expect(screen.getByText('Please introduce Moryflow.')).toBeTruthy();
    expect(screen.getByText('Searching the web for product positioning')).toBeTruthy();
    expect(screen.getByText(/moryflow is a local-first ai workspace/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /download for macos/i })).toBeTruthy();
  });

  it('does not render the workspace demo on small screens', () => {
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
    expect(screen.queryByLabelText('Chat message')).toBeNull();
    expect(screen.getByRole('link', { name: /download for macos/i })).toBeTruthy();
  });

  it('appends the fixed assistant reply after sending a new message', () => {
    render(<AgentFirstHero />);

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
