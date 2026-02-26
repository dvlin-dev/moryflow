/**
 * 订单列表视图状态
 */

export type OrdersListViewState = 'loading' | 'error' | 'empty' | 'ready';

interface ResolveOrdersListViewStateParams {
  isLoading: boolean;
  error: unknown;
  count: number;
}

export function resolveOrdersListViewState({
  isLoading,
  error,
  count,
}: ResolveOrdersListViewStateParams): OrdersListViewState {
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
