export type ActivityLogsListViewState = 'loading' | 'error' | 'empty' | 'ready';

interface ResolveActivityLogsListViewStateParams {
  isLoading: boolean;
  error: unknown;
  count: number;
}

export function resolveActivityLogsListViewState({
  isLoading,
  error,
  count,
}: ResolveActivityLogsListViewStateParams): ActivityLogsListViewState {
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
