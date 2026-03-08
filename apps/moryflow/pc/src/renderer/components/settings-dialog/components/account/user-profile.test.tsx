import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { UserProfile } from './user-profile';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
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

    expect(screen.getByText('emailNotVerified')).toBeTruthy();
    expect(screen.queryByText('emailVerified')).toBeNull();
  });

  it('allows logout without rendering loading state regressions', () => {
    render(<UserProfile user={baseUser} />);

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));

    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });
});
