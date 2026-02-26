/**
 * [PROVIDES]: digest reports list state resolver
 * [DEPENDS]: none
 * [POS]: Digest reports state fragment helper
 */

export type DigestReportsListState = 'loading' | 'error' | 'empty' | 'ready';

export function resolveDigestReportsListState(params: {
  isLoading: boolean;
  hasError: boolean;
  itemCount: number;
}): DigestReportsListState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.hasError) {
    return 'error';
  }

  if (params.itemCount === 0) {
    return 'empty';
  }

  return 'ready';
}
