/**
 * [PROVIDES]: digest topics list state resolvers
 * [DEPENDS]: none
 * [POS]: Digest topics state fragment helpers
 */

export type AllTopicsListState = 'loading' | 'error' | 'empty' | 'ready';
export type FeaturedTopicsListState = 'loading' | 'error' | 'empty' | 'ready';

export function resolveAllTopicsListState(params: {
  isLoading: boolean;
  hasError: boolean;
  itemCount: number;
}): AllTopicsListState {
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

export function resolveFeaturedTopicsListState(params: {
  isLoading: boolean;
  hasError: boolean;
  itemCount: number;
}): FeaturedTopicsListState {
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
