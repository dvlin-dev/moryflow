import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CreditHistoryPanel } from './credit-history-panel';

const mocks = vi.hoisted(() => ({
  fetchCreditHistory: vi.fn(),
}));

vi.mock('@/lib/server', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server')>('@/lib/server');
  return {
    ...actual,
    fetchCreditHistory: mocks.fetchCreditHistory,
  };
});

describe('CreditHistoryPanel', () => {
  beforeEach(() => {
    mocks.fetchCreditHistory.mockReset();
  });

  it('renders fetched ledger rows', async () => {
    mocks.fetchCreditHistory.mockResolvedValue({
      items: [
        {
          id: 'ledger-1',
          userId: 'user-1',
          eventType: 'AI_CHAT',
          direction: 'DEBIT',
          status: 'APPLIED',
          anomalyCode: null,
          summary: 'AI chat via openai/gpt-5.4',
          creditsDelta: -12,
          computedCredits: 12,
          appliedCredits: 12,
          debtDelta: 0,
          modelId: 'openai/gpt-5.4',
          providerId: 'openai',
          promptTokens: 100,
          completionTokens: 40,
          totalTokens: 140,
          errorMessage: null,
          detailsJson: null,
          createdAt: '2026-03-26T08:00:00.000Z',
          allocations: [],
        },
      ],
      pagination: { total: 1, limit: 8, offset: 0 },
    });

    render(<CreditHistoryPanel />);

    await waitFor(() => {
      expect(screen.getByText('AI chat via openai/gpt-5.4')).toBeInTheDocument();
    });
    expect(screen.getByText('-12')).toBeInTheDocument();
    expect(screen.getByText('APPLIED')).toBeInTheDocument();
  });

  it('renders empty state when no ledger rows are returned', async () => {
    mocks.fetchCreditHistory.mockResolvedValue({
      items: [],
      pagination: { total: 0, limit: 8, offset: 0 },
    });

    render(<CreditHistoryPanel />);

    await waitFor(() => {
      expect(screen.getByText('No credit events yet.')).toBeInTheDocument();
    });
  });
});
