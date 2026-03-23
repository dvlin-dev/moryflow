/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlogIndexPage } from '../{-$locale}/blog/index';

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
  createFileRoute: () => () => ({}),
}));

vi.mock('@/routes/{-$locale}/route', () => ({
  useLocale: () => mockLocale,
}));

vi.mock('@/components/shared/DownloadCtaSection', () => ({
  DownloadCtaSection: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/lib/geo-articles', () => ({
  getAllArticles: () => [
    {
      slug: 'example-article',
      content: {
        en: {
          frontmatter: {
            title: 'Example article',
            description: 'Example description',
          },
        },
        zh: {
          frontmatter: {
            title: '示例文章',
            description: '示例描述',
          },
        },
      },
    },
  ],
}));

describe('BlogIndexPage', () => {
  afterEach(() => {
    mockLocale = 'en';
    cleanup();
  });

  it('renders a prominent link to the use-cases hub', () => {
    render(<BlogIndexPage />);

    expect(
      screen.getAllByRole('link', { name: /browse use cases/i })[0]?.getAttribute('href')
    ).toBe('/use-cases');
    expect(screen.getByText(/Prefer a workflow-first way to browse/i)).toBeTruthy();
  });
});
