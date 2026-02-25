/**
 * Agent Traces API
 */

import { apiClient } from '../../lib/api-client';
import type {
  TracesResponse,
  FailedToolsResponse,
  StatsResponse,
  ToolStat,
  AgentStat,
  AgentTrace,
  TracesQuery,
  FailedToolsQuery,
  StatsQuery,
  StorageStatsResponse,
  CleanupResponse,
} from './types';

const BASE_PATH = '/api/v1/admin/agent-traces';

/**
 * 构建查询字符串
 */
function buildQueryString<T extends object>(params: T): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const agentTracesApi = {
  /**
   * 获取统计概览
   */
  getStats: (query: StatsQuery = {}) =>
    apiClient.get<StatsResponse>(`${BASE_PATH}/stats${buildQueryString(query)}`),

  /**
   * 获取 Tool 统计
   */
  getToolStats: (query: StatsQuery = {}) =>
    apiClient.get<ToolStat[]>(`${BASE_PATH}/stats/tools${buildQueryString(query)}`),

  /**
   * 获取 Agent 统计
   */
  getAgentStats: (query: StatsQuery = {}) =>
    apiClient.get<AgentStat[]>(`${BASE_PATH}/stats/agents${buildQueryString(query)}`),

  /**
   * 获取 Traces 列表
   */
  getTraces: (query: TracesQuery = {}) =>
    apiClient.get<TracesResponse>(`${BASE_PATH}${buildQueryString(query)}`),

  /**
   * 获取失败的 Tool 列表
   */
  getFailedTools: (query: FailedToolsQuery = {}) =>
    apiClient.get<FailedToolsResponse>(`${BASE_PATH}/failed-tools${buildQueryString(query)}`),

  /**
   * 获取 Trace 详情
   */
  getTraceDetail: (traceId: string) => apiClient.get<AgentTrace>(`${BASE_PATH}/${traceId}`),

  /**
   * 获取存储统计
   */
  getStorageStats: () => apiClient.get<StorageStatsResponse>(`${BASE_PATH}/storage/stats`),

  /**
   * 触发清理
   */
  triggerCleanup: () => apiClient.post<CleanupResponse>(`${BASE_PATH}/storage/cleanup`),
};
