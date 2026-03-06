/**
 * Agent Traces API
 */

import { apiClient } from '../../lib/api-client';
import { buildQuerySuffix } from '../../lib/query-string';
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

export const agentTracesApi = {
  /**
   * 获取统计概览
   */
  getStats: (query: StatsQuery = {}) =>
    apiClient.get<StatsResponse>(`${BASE_PATH}/stats${buildQuerySuffix(query)}`),

  /**
   * 获取 Tool 统计
   */
  getToolStats: (query: StatsQuery = {}) =>
    apiClient.get<ToolStat[]>(`${BASE_PATH}/stats/tools${buildQuerySuffix(query)}`),

  /**
   * 获取 Agent 统计
   */
  getAgentStats: (query: StatsQuery = {}) =>
    apiClient.get<AgentStat[]>(`${BASE_PATH}/stats/agents${buildQuerySuffix(query)}`),

  /**
   * 获取 Traces 列表
   */
  getTraces: (query: TracesQuery = {}) =>
    apiClient.get<TracesResponse>(`${BASE_PATH}${buildQuerySuffix(query)}`),

  /**
   * 获取失败的 Tool 列表
   */
  getFailedTools: (query: FailedToolsQuery = {}) =>
    apiClient.get<FailedToolsResponse>(`${BASE_PATH}/failed-tools${buildQuerySuffix(query)}`),

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
