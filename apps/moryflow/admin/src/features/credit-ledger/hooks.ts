import { useQuery } from '@tanstack/react-query';
import { creditLedgerApi } from './api';
import type { CreditLedgerFilters } from './types';

export const CREDIT_LEDGER_QUERY_KEY = ['credit-ledger'] as const;

export function useCreditLedger(filters: CreditLedgerFilters) {
  return useQuery({
    queryKey: [...CREDIT_LEDGER_QUERY_KEY, filters],
    queryFn: () => creditLedgerApi.list(filters),
  });
}
