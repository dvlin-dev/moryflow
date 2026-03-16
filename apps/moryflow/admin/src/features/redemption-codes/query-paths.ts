import type { RedemptionCodesQueryParams } from './api';

export function buildRedemptionCodesListPath(params: RedemptionCodesQueryParams): string {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.type && params.type !== 'all') sp.set('type', params.type);
  if (params.isActive && params.isActive !== 'all') sp.set('isActive', params.isActive);
  if (params.search) sp.set('search', params.search);

  return `/redemption-codes?${sp.toString()}`;
}
