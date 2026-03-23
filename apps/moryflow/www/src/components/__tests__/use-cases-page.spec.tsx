/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UseCasesPage } from '../seo-pages/UseCasesPage';

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

vi.mock('@/components/shared/DownloadCtaSection', () => ({
  DownloadCtaSection: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/seo/JsonLd', () => ({
  JsonLd: () => null,
  createBreadcrumbSchema: () => ({}),
  createWebPageSchema: () => ({}),
}));

describe('UseCasesPage', () => {
  afterEach(() => {
    mockLocale = 'en';
    cleanup();
  });

  it('renders an above-the-fold download CTA', () => {
    render(<UseCasesPage />);

    expect(screen.getByRole('link', { name: /download moryflow/i }).getAttribute('href')).toBe(
      '/download'
    );
    expect(screen.getByText(/free to start/i)).toBeTruthy();
  });
});
