/**
 * 订阅列表视图状态
 */

export type SubscriptionsListViewState = 'loading' | 'error' | 'empty' | 'ready';

interface ResolveSubscriptionsListViewStateParams {
  isLoading: boolean;
  error: unknown;
  count: number;
}

export function resolveSubscriptionsListViewState({
  isLoading,
  error,
  count,
}: ResolveSubscriptionsListViewStateParams): SubscriptionsListViewState {
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
