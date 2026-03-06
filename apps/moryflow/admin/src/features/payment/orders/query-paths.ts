import type { OrdersQueryParams } from './api';

export function buildOrdersListPath(params: OrdersQueryParams): string {
  const searchParams = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });

  if (params.status && params.status !== 'all') {
    searchParams.set('status', params.status);
  }

  if (params.productType && params.productType !== 'all') {
    searchParams.set('productType', params.productType);
  }

  return `/payment/orders?${searchParams.toString()}`;
}
