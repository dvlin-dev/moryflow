import type { AlertRule, AlertRuleType, AlertLevel, CreateAlertRuleDto } from './types';

export interface AlertRuleFormValues {
  name: string;
  type: AlertRuleType;
  level: AlertLevel;
  threshold: number;
  timeWindow: number;
  minCount: number;
  cooldown: number;
  email: string;
  enabled: boolean;
}

export const ALERT_RULE_TYPE_OPTIONS: Array<{
  value: AlertRuleType;
  label: string;
  description: string;
}> = [
  {
    value: 'tool_failure_rate',
    label: 'Tool 失败率',
    description: '当 Tool 失败率超过阈值时告警',
  },
  {
    value: 'agent_consecutive',
    label: 'Agent 连续失败',
    description: '当 Agent 连续失败时告警',
  },
  {
    value: 'system_failure_rate',
    label: '系统失败率',
    description: '当系统整体失败率超过阈值时告警',
  },
];

export const ALERT_LEVEL_OPTIONS: Array<{ value: AlertLevel; label: string }> = [
  { value: 'warning', label: '警告' },
  { value: 'critical', label: '严重' },
];

export const ALERT_RULE_COOLDOWN_OPTIONS = [
  { value: 300, label: '5 分钟' },
  { value: 900, label: '15 分钟' },
  { value: 1800, label: '30 分钟' },
  { value: 3600, label: '1 小时' },
  { value: 7200, label: '2 小时' },
  { value: 86400, label: '24 小时' },
];

export const ALERT_RULE_TIME_WINDOW_OPTIONS = [
  { value: 300, label: '5 分钟' },
  { value: 900, label: '15 分钟' },
  { value: 1800, label: '30 分钟' },
  { value: 3600, label: '1 小时' },
  { value: 7200, label: '2 小时' },
];

const DEFAULT_ALERT_RULE_FORM_VALUES: AlertRuleFormValues = {
  name: '',
  type: 'tool_failure_rate',
  level: 'warning',
  threshold: 10,
  timeWindow: 3600,
  minCount: 10,
  cooldown: 3600,
  email: '',
  enabled: true,
};

export function getAlertRuleFormValues(rule: AlertRule | null): AlertRuleFormValues {
  if (!rule) {
    return { ...DEFAULT_ALERT_RULE_FORM_VALUES };
  }

  return {
    name: rule.name,
    type: rule.type,
    level: rule.level,
    threshold: rule.condition.threshold,
    timeWindow: rule.condition.timeWindow,
    minCount: rule.condition.minCount ?? 10,
    cooldown: rule.cooldown,
    email: rule.actions[0]?.target ?? '',
    enabled: rule.enabled,
  };
}

export function buildAlertRuleDto(data: AlertRuleFormValues): CreateAlertRuleDto {
  return {
    name: data.name,
    type: data.type,
    level: data.level,
    condition: {
      metric: data.type === 'agent_consecutive' ? 'consecutive_failures' : 'failure_rate',
      operator: 'gt',
      threshold: data.threshold,
      timeWindow: data.timeWindow,
      minCount: data.minCount,
    },
    actions: [{ channel: 'email', target: data.email }],
    cooldown: data.cooldown,
    enabled: data.enabled,
  };
}
