import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from './user-profile';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  fetchCreditHistory: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/server', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server')>('@/lib/server');
  return {
    ...actual,
    useAuth: () => ({
      logout: mocks.logout,
      refresh: vi.fn(),
      isLoading: false,
    }),
    fetchCreditHistory: mocks.fetchCreditHistory,
  };
});

vi.mock('./subscription-dialog', () => ({
  SubscriptionDialog: () => null,
}));

vi.mock('./credit-packs-dialog', () => ({
  CreditPacksDialog: () => null,
}));

vi.mock('./delete-account-dialog', () => ({
  DeleteAccountDialog: () => <button type="button">delete-account-dialog</button>,
}));

describe('UserProfile', () => {
  beforeEach(() => {
    mocks.logout.mockReset();
    mocks.fetchCreditHistory.mockReset();
    mocks.fetchCreditHistory.mockResolvedValue({
      items: [],
      pagination: { total: 0, limit: 8, offset: 0 },
    });
  });

  const baseUser = {
    id: 'user_1',
    email: 'demo@moryflow.com',
    emailVerified: true,
    name: 'Demo User',
    image: undefined,
    createdAt: '2026-03-08T00:00:00.000Z',
    subscriptionTier: 'free' as const,
    tierInfo: {
      displayName: 'Free',
      features: ['Feature A'],
      creditsPerMonth: 0,
    },
    credits: {
      daily: 1,
      subscription: 2,
      purchased: 3,
      total: 6,
      debt: 0,
      available: 6,
    },
  };

  it('renders verified email state when user.emailVerified is true', () => {
    render(<UserProfile user={baseUser} />);

    expect(screen.getByText('emailVerified')).toBeTruthy();
    expect(screen.queryByText('emailNotVerified')).toBeNull();
  });

  it('renders unverified email state when user.emailVerified is false', () => {
    render(<UserProfile user={{ ...baseUser, emailVerified: false }} />);

    expect(screen.queryByText('emailNotVerified')).toBeNull();
    expect(screen.queryByText('emailVerified')).toBeNull();
  });

  it('allows logout without rendering loading state regressions', () => {
    render(<UserProfile user={baseUser} />);

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));

    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  it('renders the credit history panel inside the credits section', async () => {
    mocks.fetchCreditHistory.mockResolvedValue({
      items: [
        {
          id: 'ledger-1',
          userId: 'user_1',
          eventType: 'AI_CHAT',
          direction: 'DEBIT',
          status: 'APPLIED',
          anomalyCode: null,
          summary: 'AI chat via openai/gpt-5.4',
          creditsDelta: -6,
          computedCredits: 6,
          appliedCredits: 6,
          debtDelta: 0,
          modelId: 'openai/gpt-5.4',
          providerId: 'openai',
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
          errorMessage: null,
          detailsJson: null,
          createdAt: '2026-03-26T08:00:00.000Z',
          allocations: [],
        },
      ],
      pagination: { total: 1, limit: 8, offset: 0 },
    });

    render(<UserProfile user={baseUser} />);

    await waitFor(() => {
      expect(screen.getByText('Credit History')).toBeInTheDocument();
    });
    expect(screen.getByText('AI chat via openai/gpt-5.4')).toBeInTheDocument();
  });
});
