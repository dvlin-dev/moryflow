/**
 * Alerts Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from './api'
import type {
  AlertRulesQuery,
  AlertHistoryQuery,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from './types'

// ==========================================
// 查询 Keys
// ==========================================

export const alertQueryKeys = {
  all: ['alerts'] as const,
  rules: () => [...alertQueryKeys.all, 'rules'] as const,
  rulesList: (query: AlertRulesQuery) => [...alertQueryKeys.rules(), query] as const,
  rule: (id: string) => [...alertQueryKeys.rules(), id] as const,
  history: () => [...alertQueryKeys.all, 'history'] as const,
  historyList: (query: AlertHistoryQuery) => [...alertQueryKeys.history(), query] as const,
  stats: (days?: number) => [...alertQueryKeys.all, 'stats', days] as const,
}

// ==========================================
// 规则 Hooks
// ==========================================

/**
 * 获取规则列表
 */
export function useAlertRules(query: AlertRulesQuery = {}) {
  return useQuery({
    queryKey: alertQueryKeys.rulesList(query),
    queryFn: () => alertsApi.getRules(query),
  })
}

/**
 * 获取单个规则
 */
export function useAlertRule(id: string | null) {
  return useQuery({
    queryKey: alertQueryKeys.rule(id ?? ''),
    queryFn: () => alertsApi.getRule(id!),
    enabled: !!id,
  })
}

/**
 * 创建规则
 */
export function useCreateAlertRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateAlertRuleDto) => alertsApi.createRule(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertQueryKeys.rules() })
    },
  })
}

/**
 * 更新规则
 */
export function useUpdateAlertRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAlertRuleDto }) =>
      alertsApi.updateRule(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertQueryKeys.rules() })
    },
  })
}

/**
 * 删除规则
 */
export function useDeleteAlertRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => alertsApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertQueryKeys.rules() })
    },
  })
}

// ==========================================
// 历史 Hooks
// ==========================================

/**
 * 获取告警历史
 */
export function useAlertHistory(query: AlertHistoryQuery = {}) {
  return useQuery({
    queryKey: alertQueryKeys.historyList(query),
    queryFn: () => alertsApi.getHistory(query),
  })
}

// ==========================================
// 统计 Hooks
// ==========================================

/**
 * 获取告警统计
 */
export function useAlertStats(days?: number) {
  return useQuery({
    queryKey: alertQueryKeys.stats(days),
    queryFn: () => alertsApi.getStats(days),
  })
}

/**
 * 手动触发检测
 */
export function useTriggerDetection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => alertsApi.triggerDetection(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertQueryKeys.history() })
      queryClient.invalidateQueries({ queryKey: alertQueryKeys.stats() })
    },
  })
}
