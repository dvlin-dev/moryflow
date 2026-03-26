import type {
  CreditLedgerAnomalyCode,
  CreditLedgerEventType,
  CreditLedgerListResponse,
  CreditLedgerStatus,
} from '@/types/api';

export interface CreditLedgerFilters {
  page: number;
  pageSize: number;
  userId?: string;
  email?: string;
  eventType?: CreditLedgerEventType;
  status?: CreditLedgerStatus;
  anomalyCode?: CreditLedgerAnomalyCode;
  zeroDelta?: boolean;
  hasTokens?: boolean;
}

export type CreditLedgerResponse = CreditLedgerListResponse;
