/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import {
  buildDefaultPermissionRules,
  evaluatePermissionDecision,
  type PermissionDecisionInfo,
  type PermissionRule,
} from '@moryflow/agents-runtime';
import {
  applyDenyOnAsk,
  applyFullAccessOverride,
  buildEvaluationRules,
  getRuleEvaluationTargets,
  resolveExternalPathDecision,
} from './permission-runtime-guards.js';

describe('permission-runtime external path guard', () => {
  it('Vault 内 fs 目标不走 external path 授权拦截', () => {
    const decision = resolveExternalPathDecision({
      toolName: 'read_file',
      domain: 'read',
      targets: ['fs:/vault/docs/a.md'],
      vaultRoot: '/vault',
      authorizedPaths: [],
    });

    expect(decision).toBeNull();
  });

  it('Vault 外未授权路径触发审批', () => {
    const decision = resolveExternalPathDecision({
      toolName: 'read_file',
      domain: 'read',
      targets: ['fs:/external/docs/a.md'],
      vaultRoot: '/vault',
      authorizedPaths: [],
    });

    expect(decision).toMatchObject({
      decision: 'ask',
      rulePattern: 'external_path_unapproved',
      targets: ['fs:/external/docs/a.md'],
    });
  });

  it('Vault 外已授权路径直接放行（目录继承）', () => {
    const decision = resolveExternalPathDecision({
      toolName: 'read_file',
      domain: 'read',
      targets: ['fs:/external/docs/nested/a.md'],
      vaultRoot: '/vault',
      authorizedPaths: ['/external/docs'],
    });

    expect(decision).toMatchObject({
      decision: 'allow',
      rulePattern: 'external_path_authorized',
      targets: ['fs:/external/docs/nested/a.md'],
    });
  });

  it('混合目标时仅以 Vault 外目标判定', () => {
    const decision = resolveExternalPathDecision({
      toolName: 'read_file',
      domain: 'read',
      targets: ['fs:/vault/docs/a.md', 'fs:/external/docs/b.md'],
      vaultRoot: '/vault',
      authorizedPaths: [],
    });

    expect(decision).toMatchObject({
      decision: 'ask',
      rulePattern: 'external_path_unapproved',
      targets: ['fs:/external/docs/b.md'],
    });
  });

  it('非绝对 fs target 不参与 external path 判定', () => {
    const decision = resolveExternalPathDecision({
      toolName: 'read_file',
      domain: 'read',
      targets: ['fs:../outside.md'],
      vaultRoot: '/vault',
      authorizedPaths: [],
    });

    expect(decision).toBeNull();
  });
});

describe('permission-runtime full_access override', () => {
  it('full_access 覆盖 external path 未授权审批', () => {
    const info: PermissionDecisionInfo = {
      toolName: 'read_file',
      domain: 'read',
      targets: ['fs:/external/docs/a.md'],
      decision: 'ask',
      rulePattern: 'external_path_unapproved',
    };

    expect(applyFullAccessOverride(info, 'full_access')).toMatchObject({
      decision: 'allow',
      rulePattern: 'full_access',
    });
  });

  it('ask 模式保持 external path 审批', () => {
    const info: PermissionDecisionInfo = {
      toolName: 'read_file',
      domain: 'read',
      targets: ['fs:/external/docs/a.md'],
      decision: 'ask',
      rulePattern: 'external_path_unapproved',
    };

    expect(applyFullAccessOverride(info, 'ask')).toEqual(info);
  });

  it('覆盖非 external deny（Vault 内规则拒绝）', () => {
    const info: PermissionDecisionInfo = {
      toolName: 'write_file',
      domain: 'edit',
      targets: ['fs:/vault/docs/a.md'],
      decision: 'deny',
      rulePattern: 'fs:/vault/docs/**',
    };

    expect(applyFullAccessOverride(info, 'full_access')).toMatchObject({
      decision: 'allow',
      rulePattern: 'full_access',
    });
  });
});

describe('permission-runtime deny_on_ask override', () => {
  it('deny_on_ask 会把 ask 决策直接收口为 deny', () => {
    const info: PermissionDecisionInfo = {
      toolName: 'bash',
      domain: 'bash',
      targets: ['shell:git status'],
      decision: 'ask',
      rulePattern: 'shell:*',
    };

    expect(applyDenyOnAsk(info, 'deny_on_ask')).toMatchObject({
      decision: 'deny',
      rulePattern: 'shell:*:deny_on_ask',
    });
  });

  it('interactive 模式保持 ask 决策不变', () => {
    const info: PermissionDecisionInfo = {
      toolName: 'bash',
      domain: 'bash',
      targets: ['shell:git status'],
      decision: 'ask',
      rulePattern: 'shell:*',
    };

    expect(applyDenyOnAsk(info, 'interactive')).toEqual(info);
  });
});

describe('permission-runtime evaluation target selection', () => {
  it('外部路径已授权时，不短路 Vault 目标规则评估', () => {
    const allTargets = ['vault:/system/secret.md', 'fs:/external/docs/a.md'];
    const externalDecision = resolveExternalPathDecision({
      toolName: 'move',
      domain: 'edit',
      targets: allTargets,
      vaultRoot: '/vault',
      authorizedPaths: ['/external/docs'],
    });

    expect(externalDecision).toMatchObject({
      decision: 'allow',
      targets: ['fs:/external/docs/a.md'],
      rulePattern: 'external_path_authorized',
    });
    expect(getRuleEvaluationTargets(allTargets, externalDecision)).toEqual([
      'vault:/system/secret.md',
    ]);
  });

  it('外部路径未授权或未命中时，保持原始 target 集参与评估', () => {
    const allTargets = ['vault:/docs/a.md', 'fs:/external/docs/a.md'];
    const externalUnapproved = resolveExternalPathDecision({
      toolName: 'move',
      domain: 'edit',
      targets: allTargets,
      vaultRoot: '/vault',
      authorizedPaths: [],
    });

    expect(getRuleEvaluationTargets(allTargets, externalUnapproved)).toEqual(['vault:/docs/a.md']);
    expect(getRuleEvaluationTargets(allTargets, null)).toEqual(allTargets);
  });
});

describe('permission-runtime rule selection', () => {
  it('filters deny rules for interactive sessions so vault-internal absolute fs edits are not hard denied', () => {
    const rules = buildEvaluationRules({
      userRules: [] satisfies PermissionRule[],
      mcpServerIds: [],
      hasPermissionRulesOverride: false,
    });

    expect(
      evaluatePermissionDecision({
        domain: 'edit',
        targets: ['fs:/vault/docs/a.md'],
        rules,
      }).decision
    ).not.toBe('deny');
  });

  it('keeps deny rules when automation permission overrides are active', () => {
    const rules = buildEvaluationRules({
      userRules: [] satisfies PermissionRule[],
      mcpServerIds: [],
      hasPermissionRulesOverride: true,
    });

    expect(
      evaluatePermissionDecision({
        domain: 'edit',
        targets: ['fs:/vault/docs/a.md'],
        rules,
      }).decision
    ).toBe('deny');
    expect(
      buildDefaultPermissionRules({ mcpServerIds: [] }).some(
        (rule) => rule.domain === 'edit' && rule.pattern === 'fs:**' && rule.decision === 'deny'
      )
    ).toBe(true);
  });
});
