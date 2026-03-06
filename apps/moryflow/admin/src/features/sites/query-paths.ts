import { buildQuerySuffix } from '@/lib/query-string';
import type { SiteListParams } from './types';

export function buildSitesListPath(params: SiteListParams): string {
  return `/sites${buildQuerySuffix({
    limit: params.limit,
    offset: params.offset,
    search: params.search,
    status: params.status,
    type: params.type,
    userTier: params.userTier,
    expiryFilter: params.expiryFilter,
  })}`;
}
