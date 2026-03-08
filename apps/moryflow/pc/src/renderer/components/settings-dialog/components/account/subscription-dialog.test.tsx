/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionDialog } from './subscription-dialog';

const mockFetchProducts = vi.fn();
const mockPurchase = vi.fn();
const mockClearCheckoutUrl = vi.fn();
const mockRefresh = vi.fn();
const mockT = (key: string, params?: Record<string, string | number>) => {
  const messages: Record<string, string> = {
    upgradeMembership: 'Upgrade Membership',
    choosePlanDescription: 'Choose the right plan for your workflow.',
    monthly: 'Monthly',
    yearly: 'Yearly',
    recommended: 'Recommended',
    starterPlan: 'Starter',
    basicPlan: 'Basic',
    proPlan: 'Pro',
    starterPlanTagline: 'For light personal use',
    basicPlanTagline: 'Best for growing creators',
    proPlanTagline: 'For power users and teams',
    perMonth: '/month',
    perYear: '/year',
    subscribeNow: 'Subscribe now',
    currentPlanBadge: 'Current plan',
    subscriptionNote: 'Cancel anytime.',
    loadProductsFailed: 'Failed to load products',
    annualBillingHighlight: '2 months free with annual billing',
    allPaidPlansInclude: 'All paid plans include',
    currentPlanHelper: 'Your active plan',
    currentPlanCta: 'Included in your workspace',
    subscriptionSummaryEyebrow: 'Workspace plans',
    subscriptionSummaryTitle: 'Simple pricing for your workspace',
    subscriptionSummaryDescription: 'Choose a plan based on credits, sync, and support.',
  };

  if (key === 'savePercent') {
    return `Save ${params?.percent}%`;
  }

  if (key === 'monthlyCredits') {
    return `${params?.credits} credits/month`;
  }

  if (key === 'equivalentMonthly') {
    return `Equivalent to $${params?.price}/month`;
  }

  return messages[key] ?? key;
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
    purchase: mockPurchase,
    purchasingId: null,
    checkoutUrl: null,
    clearCheckoutUrl: mockClearCheckoutUrl,
  }),
}));

vi.mock('@/lib/server', () => ({
  useAuth: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock('@/components/payment-dialog', () => ({
  PaymentDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="payment-dialog">payment-dialog</div> : null,
}));

vi.mock('@moryflow/api', () => ({
  getTierInfo: (tier: 'starter' | 'basic' | 'pro') => {
    if (tier === 'starter') {
      return {
        creditsPerMonth: 5000,
        features: ['5,000 credits per month', 'Cloud sync', 'Multi-device access'],
      };
    }

    if (tier === 'basic') {
      return {
        creditsPerMonth: 10000,
        features: ['10,000 credits per month', 'Cloud sync', 'Priority support'],
      };
    }

    return {
      creditsPerMonth: 20000,
      features: ['20,000 credits per month', 'Cloud sync', 'Priority support'],
    };
  },
}));

describe('SubscriptionDialog', () => {
  beforeEach(() => {
    mockFetchProducts.mockReset();
    mockPurchase.mockReset();
    mockClearCheckoutUrl.mockReset();
    mockRefresh.mockReset();
    mockFetchProducts.mockResolvedValue({
      products: [
        {
          id: 'starter-monthly',
          name: 'starter monthly',
          type: 'subscription',
          priceUsd: 9,
          billingCycle: 'monthly',
        },
        {
          id: 'basic-monthly',
          name: 'basic monthly',
          type: 'subscription',
          priceUsd: 19,
          billingCycle: 'monthly',
        },
        {
          id: 'pro-monthly',
          name: 'pro monthly',
          type: 'subscription',
          priceUsd: 29,
          billingCycle: 'monthly',
        },
        {
          id: 'starter-yearly',
          name: 'starter yearly',
          type: 'subscription',
          priceUsd: 90,
          billingCycle: 'yearly',
        },
        {
          id: 'basic-yearly',
          name: 'basic yearly',
          type: 'subscription',
          priceUsd: 190,
          billingCycle: 'yearly',
        },
        {
          id: 'pro-yearly',
          name: 'pro yearly',
          type: 'subscription',
          priceUsd: 199,
          billingCycle: 'yearly',
        },
      ],
    });
  });

  it('renders only the three pricing plans without the extra summary panel', async () => {
    render(<SubscriptionDialog open onOpenChange={() => undefined} currentTier="starter" />);

    await waitFor(() => {
      expect(mockFetchProducts).toHaveBeenCalled();
    });

    await screen.findByText('Pro');
    expect(screen.getByTestId('subscription-dialog-surface').className).toContain(
      'sm:max-w-[1160px]'
    );
    expect(screen.queryByTestId('subscription-dialog-summary')).not.toBeInTheDocument();
    expect(screen.getByTestId('subscription-plan-starter')).toBeInTheDocument();
    expect(screen.getByTestId('subscription-plan-basic')).toBeInTheDocument();
    expect(screen.getByTestId('subscription-plan-pro')).toBeInTheDocument();
    expect(screen.getByText('For light personal use')).toBeInTheDocument();
    expect(screen.getByText('Best for growing creators')).toBeInTheDocument();
    expect(screen.getByText('For power users and teams')).toBeInTheDocument();
  });

  it('renders the current plan as a selected surface instead of a dim disabled card', async () => {
    render(<SubscriptionDialog open onOpenChange={() => undefined} currentTier="starter" />);

    const starterCard = await screen.findByTestId('subscription-plan-starter');

    expect(starterCard).toHaveAttribute('data-current', 'true');
    expect(within(starterCard).getByText('Your active plan')).toBeInTheDocument();
    expect(
      within(starterCard).getByRole('button', { name: 'Included in your workspace' })
    ).toBeInTheDocument();
  });

  it('keeps the focus on the pricing cards and subtle hover polish on non-current plans', async () => {
    render(<SubscriptionDialog open onOpenChange={() => undefined} currentTier="starter" />);

    await screen.findByText('Pro');

    expect(screen.queryByText('Workspace plans')).not.toBeInTheDocument();
    const title = screen.getByText('Upgrade Membership');
    expect(title).toBeInTheDocument();
    expect(title.className).toContain('sr-only');
    expect(screen.queryByText('Choose the right plan for your workflow.')).not.toBeInTheDocument();
    expect(screen.getByTestId('subscription-dialog-plan-grid').className).toContain(
      'xl:grid-cols-3'
    );
    expect(screen.getByTestId('subscription-plan-basic').className).toContain(
      'hover:-translate-y-0.5'
    );
    expect(screen.getByTestId('subscription-plan-pro').className).toContain('hover:shadow-md');
  });

  it('shows yearly pricing context without the removed summary panel', async () => {
    render(<SubscriptionDialog open onOpenChange={() => undefined} currentTier="starter" />);

    await screen.findByText('Pro');
    fireEvent.click(screen.getByRole('tab', { name: /Yearly/i }));

    await waitFor(() => {
      expect(screen.getByText('Equivalent to $16.58/month')).toBeInTheDocument();
    });
    expect(screen.getByText('Cancel anytime.')).toBeInTheDocument();
  });
});
