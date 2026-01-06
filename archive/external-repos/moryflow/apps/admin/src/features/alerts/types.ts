/**
 * Alerts 类型定义
 */

// ==========================================
// 枚举类型
// ==========================================

export type AlertRuleType =
  | 'tool_failure_rate'
  | 'agent_consecutive'
  | 'system_failure_rate'

export type AlertLevel = 'warning' | 'critical'

// ==========================================
// 规则条件
// ==========================================

export interface AlertRuleCondition {
  metric: 'failure_rate' | 'consecutive_failures' | 'count'
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  threshold: number
  timeWindow: number
  minCount?: number
}

export interface AlertRuleAction {
  channel: 'email'
  target: string
}

// ==========================================
// 实体类型
// ==========================================

export interface AlertRule {
  id: string
  name: string
  type: AlertRuleType
  level: AlertLevel
  condition: AlertRuleCondition
  actions: AlertRuleAction[]
  cooldown: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface AlertHistory {
  id: string
  ruleId: string
  level: AlertLevel
  context: {
    toolName?: string
    agentName?: string
    value: number
    threshold: number
    message: string
  }
  triggeredAt: string
  resolvedAt?: string
  rule?: {
    id: string
    name: string
    type: AlertRuleType
  }
}

// ==========================================
// API 请求/响应类型
// ==========================================

export interface CreateAlertRuleDto {
  name: string
  type: AlertRuleType
  level?: AlertLevel
  condition: AlertRuleCondition
  actions: AlertRuleAction[]
  cooldown?: number
  enabled?: boolean
}

export interface UpdateAlertRuleDto {
  name?: string
  type?: AlertRuleType
  level?: AlertLevel
  condition?: AlertRuleCondition
  actions?: AlertRuleAction[]
  cooldown?: number
  enabled?: boolean
}

export interface AlertRulesResponse {
  rules: AlertRule[]
}

export interface AlertHistoryResponse {
  history: AlertHistory[]
  total: number
}

export interface AlertStatsResponse {
  total: number
  byLevel: {
    warning: number
    critical: number
  }
  byType: Record<string, number>
}

// ==========================================
// 查询参数
// ==========================================

export interface AlertRulesQuery {
  type?: AlertRuleType
  enabled?: boolean
}

export interface AlertHistoryQuery {
  ruleId?: string
  level?: AlertLevel
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}
