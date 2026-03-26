import { adminApi } from '@/lib/api';
import type { CreditLedgerResponse, CreditLedgerFilters } from './types';

const buildCreditLedgerPath = (filters: CreditLedgerFilters) => {
  const searchParams = new URLSearchParams({
    limit: String(filters.pageSize),
    offset: String((filters.page - 1) * filters.pageSize),
  });

  if (filters.userId) {
    searchParams.set('userId', filters.userId);
  }
  if (filters.email) {
    searchParams.set('email', filters.email);
  }
  if (filters.eventType) {
    searchParams.set('eventType', filters.eventType);
  }
  if (filters.status) {
    searchParams.set('status', filters.status);
  }
  if (filters.anomalyCode) {
    searchParams.set('anomalyCode', filters.anomalyCode);
  }
  if (filters.zeroDelta) {
    searchParams.set('zeroDelta', 'true');
  }
  if (filters.hasTokens) {
    searchParams.set('hasTokens', 'true');
  }

  return `/credits/ledger?${searchParams.toString()}`;
};

export const creditLedgerApi = {
  list: (filters: CreditLedgerFilters) =>
    adminApi.get<CreditLedgerResponse>(buildCreditLedgerPath(filters)),
};
