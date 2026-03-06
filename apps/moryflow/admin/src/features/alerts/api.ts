/**
 * Alerts API
 */

import { apiClient } from '../../lib/api-client';
import { buildQuerySuffix } from '../../lib/query-string';
import type {
  AlertRule,
  AlertRulesResponse,
  AlertHistoryResponse,
  AlertStatsResponse,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AlertRulesQuery,
  AlertHistoryQuery,
} from './types';

const BASE_PATH = '/api/v1/admin/alerts';

export const alertsApi = {
  // ==========================================
  // 规则管理
  // ==========================================

  /**
   * 获取所有规则
   */
  getRules: (query: AlertRulesQuery = {}) =>
    apiClient.get<AlertRulesResponse>(`${BASE_PATH}/rules${buildQuerySuffix(query)}`),

  /**
   * 获取单个规则
   */
  getRule: (id: string) => apiClient.get<{ rule: AlertRule }>(`${BASE_PATH}/rules/${id}`),

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
  deleteRule: (id: string) => apiClient.delete<void>(`${BASE_PATH}/rules/${id}`),

  // ==========================================
  // 告警历史
  // ==========================================

  /**
   * 获取告警历史
   */
  getHistory: (query: AlertHistoryQuery = {}) =>
    apiClient.get<AlertHistoryResponse>(`${BASE_PATH}/history${buildQuerySuffix(query)}`),

  // ==========================================
  // 统计和操作
  // ==========================================

  /**
   * 获取告警统计
   */
  getStats: (days?: number) =>
    apiClient.get<AlertStatsResponse>(`${BASE_PATH}/stats${days ? `?days=${days}` : ''}`),

  /**
   * 手动触发检测
   */
  triggerDetection: () => apiClient.post<void>(`${BASE_PATH}/detect`),
};
