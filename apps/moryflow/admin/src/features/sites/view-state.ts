export type SitesListViewState = 'loading' | 'error' | 'empty' | 'ready';
export type SiteDetailViewState = 'loading' | 'error' | 'not-found' | 'ready';

interface ResolveSitesListViewStateParams {
  isLoading: boolean;
  error: unknown;
  count: number;
}

interface ResolveSiteDetailViewStateParams {
  isLoading: boolean;
  error: unknown;
  hasSite: boolean;
}

export function resolveSitesListViewState({
  isLoading,
  error,
  count,
}: ResolveSitesListViewStateParams): SitesListViewState {
  if (isLoading) {
    return 'loading';
  }
  if (error) {
    return 'error';
  }
  if (count === 0) {
    return 'empty';
  }
  return 'ready';
}

export function resolveSiteDetailViewState({
  isLoading,
  error,
  hasSite,
}: ResolveSiteDetailViewStateParams): SiteDetailViewState {
  if (isLoading) {
    return 'loading';
  }
  if (error) {
    return 'error';
  }
  if (!hasSite) {
    return 'not-found';
  }
  return 'ready';
}
