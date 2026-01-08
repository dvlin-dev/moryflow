/**
 * 告警相关徽章组件
 */

import { Badge } from '@/components/ui/badge'
import type { AlertRuleType, AlertLevel } from '../types'

// ==========================================
// 告警级别徽章
// ==========================================

interface AlertLevelBadgeProps {
  level: AlertLevel
}

export function AlertLevelBadge({ level }: AlertLevelBadgeProps) {
  if (level === 'critical') {
    return (
      <Badge variant="destructive" className="font-medium">
        严重
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-yellow-500 text-yellow-600">
      警告
    </Badge>
  )
}

// ==========================================
// 规则类型徽章
// ==========================================

interface AlertTypeBadgeProps {
  type: AlertRuleType
}

const TYPE_LABELS: Record<AlertRuleType, string> = {
  tool_failure_rate: 'Tool 失败率',
  agent_consecutive: 'Agent 连续失败',
  system_failure_rate: '系统失败率',
}

const TYPE_COLORS: Record<AlertRuleType, string> = {
  tool_failure_rate: 'bg-blue-100 text-blue-800',
  agent_consecutive: 'bg-purple-100 text-purple-800',
  system_failure_rate: 'bg-red-100 text-red-800',
}

export function AlertTypeBadge({ type }: AlertTypeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  )
}

// ==========================================
// 启用状态徽章
// ==========================================

interface EnabledBadgeProps {
  enabled: boolean
}

export function EnabledBadge({ enabled }: EnabledBadgeProps) {
  if (enabled) {
    return (
      <Badge variant="outline" className="border-green-500 text-green-600">
        已启用
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-gray-400 text-gray-500">
      已禁用
    </Badge>
  )
}
