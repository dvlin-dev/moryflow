/**
 * [DEFINES]: Digest run history domain types
 * [POS]: Run timeline and billing payloads
 */

export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type RunSource = 'SCHEDULED' | 'MANUAL';

export interface RunResult {
  itemsCandidate: number;
  itemsSelected: number;
  itemsDelivered: number;
  itemsDedupSkipped: number;
  itemsRedelivered: number;
  narrativeTokensUsed?: number;
}

export interface RunBilling {
  model: string;
  totalCredits: number;
  charged: boolean;
  breakdown: Record<
    string,
    {
      count: number;
      costPerCall: number;
      subtotalCredits: number;
    }
  >;
}

export interface Run {
  id: string;
  subscriptionId: string;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  status: RunStatus;
  source: RunSource;
  outputLocale: string;
  result: RunResult | null;
  billing: RunBilling | null;
  error: string | null;
  narrativeMarkdown?: string | null;
}

export interface RunQueryParams {
  page?: number;
  limit?: number;
  status?: RunStatus;
}
