import type { SubscriptionsQueryParams } from './api';

export function buildSubscriptionsListPath(params: SubscriptionsQueryParams): string {
  const searchParams = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });

  if (params.status && params.status !== 'all') {
    searchParams.set('status', params.status);
  }

  return `/payment/subscriptions?${searchParams.toString()}`;
}
