/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import type { PermissionDecisionInfo } from '@moryflow/agents-runtime';
import {
  applyFullAccessOverride,
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

  it('Vault 外未授权路径直接拒绝', () => {
    const decision = resolveExternalPathDecision({
      toolName: 'read_file',
      domain: 'read',
      targets: ['fs:/external/docs/a.md'],
      vaultRoot: '/vault',
      authorizedPaths: [],
    });

    expect(decision).toMatchObject({
      decision: 'deny',
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
      decision: 'deny',
      rulePattern: 'external_path_unapproved',
      targets: ['fs:/external/docs/b.md'],
    });
  });
});

describe('permission-runtime full_access override', () => {
  it('不覆盖 external path 未授权拒绝', () => {
    const info: PermissionDecisionInfo = {
      toolName: 'read_file',
      domain: 'read',
      targets: ['fs:/external/docs/a.md'],
      decision: 'deny',
      rulePattern: 'external_path_unapproved',
    };

    expect(applyFullAccessOverride(info, 'full_access')).toEqual(info);
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
    const externalDenied = resolveExternalPathDecision({
      toolName: 'move',
      domain: 'edit',
      targets: allTargets,
      vaultRoot: '/vault',
      authorizedPaths: [],
    });

    expect(getRuleEvaluationTargets(allTargets, externalDenied)).toEqual(allTargets);
    expect(getRuleEvaluationTargets(allTargets, null)).toEqual(allTargets);
  });
});
