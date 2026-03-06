/**
 * Provider 列表视图状态
 */

export type ProvidersViewState = 'loading' | 'error' | 'empty' | 'ready';

interface ResolveProvidersViewStateParams {
  isLoading: boolean;
  error: unknown;
  count: number;
}

export function resolveProvidersViewState({
  isLoading,
  error,
  count,
}: ResolveProvidersViewStateParams): ProvidersViewState {
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
