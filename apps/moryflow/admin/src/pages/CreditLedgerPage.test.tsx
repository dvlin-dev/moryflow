import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreditLedgerPage from './CreditLedgerPage';
import UserDetailPage from './UserDetailPage';

const mocks = vi.hoisted(() => ({
  useCreditLedger: vi.fn(),
  useUserDetail: vi.fn(),
  useGrantCredits: vi.fn(),
}));

vi.mock('@/components/shared', () => ({
  PageHeader: ({
    title,
    description,
    action,
  }: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  ),
  SimplePagination: () => <div>pagination</div>,
  TableSkeleton: () => <div>table-skeleton</div>,
  TierBadge: ({ tier }: { tier: string }) => <span>{tier}</span>,
}));

vi.mock('@/features/credit-ledger', () => ({
  useCreditLedger: mocks.useCreditLedger,
}));

vi.mock('@/features/users', () => ({
  useUserDetail: mocks.useUserDetail,
  useGrantCredits: mocks.useGrantCredits,
  GrantCreditsDialog: () => null,
}));

vi.mock('@/features/storage', () => ({
  UserStorageCard: ({ userId }: { userId: string }) => <div>storage-{userId}</div>,
}));

describe('CreditLedgerPage', () => {
  beforeEach(() => {
    mocks.useGrantCredits.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mocks.useCreditLedger.mockReturnValue({
      data: {
        items: [
          {
            id: 'ledger-1',
            userId: 'user-1',
            userEmail: 'demo@moryflow.com',
            eventType: 'AI_CHAT',
            direction: 'DEBIT',
            status: 'SKIPPED',
            anomalyCode: 'ZERO_CREDITS_WITH_USAGE',
            summary: 'AI chat via openai/gpt-5.4',
            creditsDelta: 0,
            computedCredits: 0,
            appliedCredits: 0,
            debtDelta: 0,
            modelId: 'openai/gpt-5.4',
            providerId: 'openai',
            promptTokens: 100,
            completionTokens: 20,
            totalTokens: 120,
            errorMessage: null,
            detailsJson: null,
            createdAt: '2026-03-26T08:00:00.000Z',
            allocations: [],
          },
        ],
        pagination: {
          total: 1,
          limit: 25,
          offset: 0,
        },
      },
      isLoading: false,
      error: null,
    });
    mocks.useUserDetail.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          email: 'demo@moryflow.com',
          subscriptionTier: 'free',
          isAdmin: false,
          createdAt: '2026-03-26T08:00:00.000Z',
          deletedAt: null,
        },
        credits: {
          subscription: 2,
          purchased: 3,
          total: 5,
        },
        recentCreditLedger: [
          {
            id: 'ledger-1',
            userId: 'user-1',
            eventType: 'AI_CHAT',
            direction: 'DEBIT',
            status: 'SKIPPED',
            anomalyCode: 'ZERO_CREDITS_WITH_USAGE',
            summary: 'AI chat via openai/gpt-5.4',
            creditsDelta: 0,
            computedCredits: 0,
            appliedCredits: 0,
            debtDelta: 0,
            modelId: 'openai/gpt-5.4',
            providerId: 'openai',
            promptTokens: 100,
            completionTokens: 20,
            totalTokens: 120,
            errorMessage: null,
            detailsJson: null,
            createdAt: '2026-03-26T08:00:00.000Z',
            allocations: [],
          },
        ],
        deletionRecord: null,
      },
      isLoading: false,
    });
  });

  it('loads ledger rows with the userId query filter and renders anomaly controls', () => {
    render(
      <MemoryRouter initialEntries={['/credits?userId=user-1']}>
        <Routes>
          <Route path="/credits" element={<CreditLedgerPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(mocks.useCreditLedger).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
      })
    );
    expect(screen.getByText('AI chat via openai/gpt-5.4')).toBeInTheDocument();
    expect(screen.getByText('Zero delta only')).toBeInTheDocument();
    expect(screen.getByText('Has tokens')).toBeInTheDocument();
  });

  it('shows recent ledger rows inside user detail and links to the full ledger page', () => {
    render(
      <MemoryRouter initialEntries={['/users/user-1']}>
        <Routes>
          <Route path="/users/:id" element={<UserDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Recent Credit Ledger')).toBeInTheDocument();
    expect(screen.getByText('AI chat via openai/gpt-5.4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Ledger/i })).toBeInTheDocument();
  });
});
