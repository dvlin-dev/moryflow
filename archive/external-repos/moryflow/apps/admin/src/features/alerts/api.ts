/**
 * Alerts API
 */

import { apiClient } from '../../lib/api-client'
import type {
  AlertRule,
  AlertRulesResponse,
  AlertHistoryResponse,
  AlertStatsResponse,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AlertRulesQuery,
  AlertHistoryQuery,
} from './types'

const BASE_PATH = '/api/admin/alerts'

/**
 * 构建查询字符串
 */
function buildQueryString<T extends object>(params: T): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  }
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

export const alertsApi = {
  // ==========================================
  // 规则管理
  // ==========================================

  /**
   * 获取所有规则
   */
  getRules: (query: AlertRulesQuery = {}) =>
    apiClient.get<AlertRulesResponse>(`${BASE_PATH}/rules${buildQueryString(query)}`),

  /**
   * 获取单个规则
   */
  getRule: (id: string) =>
    apiClient.get<{ rule: AlertRule }>(`${BASE_PATH}/rules/${id}`),

  /**
   * 创建规则
   */
  createRule: (dto: CreateAlertRuleDto) =>
    apiClient.post<{ rule: AlertRule }>(`${BASE_PATH}/rules`, dto),

  /**
   * 更新规则
   */
  updateRule: (id: string, dto: UpdateAlertRuleDto) =>
    apiClient.put<{ rule: AlertRule }>(`${BASE_PATH}/rules/${id}`, dto),

  /**
   * 删除规则
   */
  deleteRule: (id: string) =>
    apiClient.delete<{ success: boolean }>(`${BASE_PATH}/rules/${id}`),

  // ==========================================
  // 告警历史
  // ==========================================

  /**
   * 获取告警历史
   */
  getHistory: (query: AlertHistoryQuery = {}) =>
    apiClient.get<AlertHistoryResponse>(`${BASE_PATH}/history${buildQueryString(query)}`),

  // ==========================================
  // 统计和操作
  // ==========================================

  /**
   * 获取告警统计
   */
  getStats: (days?: number) =>
    apiClient.get<AlertStatsResponse>(
      `${BASE_PATH}/stats${days ? `?days=${days}` : ''}`,
    ),

  /**
   * 手动触发检测
   */
  triggerDetection: () =>
    apiClient.post<{ success: boolean; message: string }>(`${BASE_PATH}/detect`),
}
