export type RedemptionCodesViewState = 'loading' | 'error' | 'empty' | 'ready';

export function resolveRedemptionCodesViewState({
  isLoading,
  error,
  count,
}: {
  isLoading: boolean;
  error: unknown;
  count: number;
}): RedemptionCodesViewState {
  if (isLoading) return 'loading';
  if (error) return 'error';
  if (count === 0) return 'empty';
  return 'ready';
}
