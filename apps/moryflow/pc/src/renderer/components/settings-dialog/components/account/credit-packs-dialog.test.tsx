/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditPacksDialog } from './credit-packs-dialog';

const mockFetchProducts = vi.fn();
const mockT = (key: string, params?: Record<string, string | number>) => {
  if (key === 'creditPackCredits') {
    return `${params?.credits} credits`;
  }

  return (
    {
      buyCredits: 'Buy Credits',
      creditPackPopular: 'Popular',
      creditPackBuyNow: 'Buy now',
      creditPackExpiry: 'Credits expire in 12 months.',
      creditPackUsageOrder: 'Oldest credits are used first, even in long localized strings.',
      loadProductsFailed: 'Failed to load products',
      creditPackPaymentSuccess: 'Credits added',
    }[key] ?? key
  );
};

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

vi.mock('@/lib/server/api', () => ({
  fetchProducts: () => mockFetchProducts(),
}));

vi.mock('@/lib/server/hooks', () => ({
  usePurchase: () => ({
    purchase: vi.fn(),
    purchasingId: null,
    checkoutUrl: null,
    clearCheckoutUrl: vi.fn(),
  }),
}));

vi.mock('@/lib/server', () => ({
  useAuth: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/components/payment-dialog', () => ({
  PaymentDialog: () => null,
}));

describe('CreditPacksDialog', () => {
  beforeEach(() => {
    mockFetchProducts.mockReset();
    mockFetchProducts.mockResolvedValue({
      products: [
        { id: 'credits-5000', type: 'credits', credits: 5000, priceUsd: 5 },
        { id: 'credits-10000', type: 'credits', credits: 10000, priceUsd: 9 },
        { id: 'credits-50000', type: 'credits', credits: 50000, priceUsd: 29 },
      ],
    });
  });

  it('allows the policy footer text to wrap inside the dialog', async () => {
    render(<CreditPacksDialog open onOpenChange={() => undefined} />);

    await waitFor(() => {
      expect(mockFetchProducts).toHaveBeenCalled();
    });

    const footer = await screen.findByText(
      /Credits expire in 12 months\. Oldest credits are used first/i
    );

    expect(footer.className).not.toContain('whitespace-nowrap');
  });
});
