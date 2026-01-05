/**
 * Agent Traces Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentTracesApi } from './api'
import type { TracesQuery, FailedToolsQuery, StatsQuery } from './types'

const QUERY_KEYS = {
  stats: (query: StatsQuery) => ['agent-traces', 'stats', query] as const,
  toolStats: (query: StatsQuery) => ['agent-traces', 'tool-stats', query] as const,
  agentStats: (query: StatsQuery) => ['agent-traces', 'agent-stats', query] as const,
  traces: (query: TracesQuery) => ['agent-traces', 'list', query] as const,
  failedTools: (query: FailedToolsQuery) => ['agent-traces', 'failed-tools', query] as const,
  traceDetail: (traceId: string) => ['agent-traces', 'detail', traceId] as const,
  storageStats: () => ['agent-traces', 'storage-stats'] as const,
}

/**
 * 获取统计概览
 */
export function useAgentTraceStats(query: StatsQuery = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.stats(query),
    queryFn: () => agentTracesApi.getStats(query),
  })
}

/**
 * 获取 Tool 统计
 */
export function useToolStats(query: StatsQuery = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.toolStats(query),
    queryFn: () => agentTracesApi.getToolStats(query),
  })
}

/**
 * 获取 Agent 统计
 */
export function useAgentStats(query: StatsQuery = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.agentStats(query),
    queryFn: () => agentTracesApi.getAgentStats(query),
  })
}

/**
 * 获取 Traces 列表
 */
export function useAgentTraces(query: TracesQuery = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.traces(query),
    queryFn: () => agentTracesApi.getTraces(query),
  })
}

/**
 * 获取失败的 Tool 列表
 */
export function useFailedTools(query: FailedToolsQuery = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.failedTools(query),
    queryFn: () => agentTracesApi.getFailedTools(query),
  })
}

/**
 * 获取 Trace 详情
 */
export function useTraceDetail(traceId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.traceDetail(traceId ?? ''),
    queryFn: () => agentTracesApi.getTraceDetail(traceId!),
    enabled: !!traceId,
  })
}

/**
 * 获取存储统计
 */
export function useStorageStats() {
  return useQuery({
    queryKey: QUERY_KEYS.storageStats(),
    queryFn: () => agentTracesApi.getStorageStats(),
  })
}

/**
 * 触发清理
 */
export function useTriggerCleanup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => agentTracesApi.triggerCleanup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats() })
    },
  })
}
