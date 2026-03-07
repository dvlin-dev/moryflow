import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CrawlRequestCard } from './crawl-request-card';

const crawlFormSpy = vi.fn();

vi.mock('./crawl-form', () => ({
  CrawlForm: (props: unknown) => {
    crawlFormSpy(props);
    return <div data-testid="crawl-form" />;
  },
}));

describe('CrawlRequestCard', () => {
  it('会将 hasUsableKey 透传给 CrawlForm', () => {
    render(
      <CrawlRequestCard
        apiKeys={[]}
        selectedKeyId="key_1"
        hasUsableKey={false}
        isLoading={false}
        onKeyChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByTestId('crawl-form')).toBeInTheDocument();
    expect(crawlFormSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        hasUsableKey: false,
      })
    );
  });
});
