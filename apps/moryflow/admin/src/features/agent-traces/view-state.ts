/**
 * Agent Traces 视图状态分发
 */

export type AgentTraceListViewState = 'loading' | 'error' | 'empty' | 'ready';
export type TraceDetailViewState = 'loading' | 'error' | 'empty' | 'ready';

interface ResolveListViewStateParams {
  isLoading: boolean;
  error: unknown;
  count: number;
}

interface ResolveTraceDetailViewStateParams {
  isLoading: boolean;
  error: unknown;
  hasTrace: boolean;
}

export function resolveAgentTraceListViewState({
  isLoading,
  error,
  count,
}: ResolveListViewStateParams): AgentTraceListViewState {
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

export function resolveTraceDetailViewState({
  isLoading,
  error,
  hasTrace,
}: ResolveTraceDetailViewStateParams): TraceDetailViewState {
  if (isLoading) {
    return 'loading';
  }
  if (error) {
    return 'error';
  }
  if (!hasTrace) {
    return 'empty';
  }
  return 'ready';
}
