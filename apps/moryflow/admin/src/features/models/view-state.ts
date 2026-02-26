/**
 * Model 列表视图状态
 */

export type ModelsListViewState = 'loading' | 'error' | 'empty' | 'ready';

interface ResolveModelsListViewStateParams {
  isLoading: boolean;
  error: unknown;
  count: number;
}

export function resolveModelsListViewState({
  isLoading,
  error,
  count,
}: ResolveModelsListViewStateParams): ModelsListViewState {
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
