import { describe, expect, it } from 'vitest';
import { buildAlertRuleDto, getAlertRuleFormValues } from './alert-rule-form';
import type { AlertRule } from './types';

describe('getAlertRuleFormValues', () => {
  it('创建模式默认邮箱为空字符串', () => {
    const values = getAlertRuleFormValues(null);
    expect(values.email).toBe('');
  });

  it('编辑模式缺少 target 时仍回填为空字符串', () => {
    const rule = {
      id: 'rule_1',
      name: 'rule',
      type: 'tool_failure_rate',
      level: 'warning',
      condition: {
        metric: 'failure_rate',
        operator: 'gt',
        threshold: 10,
        timeWindow: 3600,
      },
      actions: [],
      cooldown: 300,
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies AlertRule;

    const values = getAlertRuleFormValues(rule);
    expect(values.email).toBe('');
  });
});

describe('buildAlertRuleDto', () => {
  it('agent_consecutive 规则映射为 consecutive_failures', () => {
    const dto = buildAlertRuleDto({
      name: 'rule',
      type: 'agent_consecutive',
      level: 'critical',
      threshold: 3,
      timeWindow: 1800,
      minCount: 5,
      cooldown: 300,
      email: 'ops@example.com',
      enabled: true,
    });

    expect(dto.condition.metric).toBe('consecutive_failures');
    expect(dto.actions[0]).toEqual({
      channel: 'email',
      target: 'ops@example.com',
    });
  });
});
