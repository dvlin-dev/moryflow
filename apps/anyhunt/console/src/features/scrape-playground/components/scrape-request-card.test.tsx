import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScrapeRequestCard } from './scrape-request-card';

const scrapeFormSpy = vi.fn();

vi.mock('./scrape-form', () => ({
  ScrapeForm: (props: unknown) => {
    scrapeFormSpy(props);
    return <div data-testid="scrape-form" />;
  },
}));

describe('ScrapeRequestCard', () => {
  it('会将 hasUsableKey 透传给 ScrapeForm', () => {
    render(
      <ScrapeRequestCard
        apiKeys={[]}
        selectedKeyId="key_1"
        hasUsableKey={true}
        isLoading={false}
        onKeyChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByTestId('scrape-form')).toBeInTheDocument();
    expect(scrapeFormSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        hasUsableKey: true,
      })
    );
  });
});
