/**
 * [PROVIDES]: 权限判定纯函数（Vault 内外边界 + full_access 覆盖规则）
 * [DEPENDS]: agents-runtime types
 * [POS]: permission-runtime 可测试的无副作用逻辑
 */

import type { AgentAccessMode, PermissionDecisionInfo } from '@moryflow/agents-runtime';

export const normalizeComparablePath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').replace(/\/+$/g, '');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
};

const extractFsAbsolutePath = (target: string): string | null => {
  if (!target.startsWith('fs:')) return null;
  const raw = target.slice('fs:'.length).trim();
  if (!raw) return null;
  return normalizeComparablePath(raw);
};

const isPathWithinRoot = (absolutePath: string, rootPath: string): boolean => {
  if (absolutePath === rootPath) return true;
  return absolutePath.startsWith(`${rootPath}/`);
};

const isAuthorizedExternalPath = (absolutePath: string, allowlist: string[]): boolean => {
  for (const pathEntry of allowlist) {
    if (absolutePath === pathEntry) return true;
    if (absolutePath.startsWith(`${pathEntry}/`)) return true;
  }
  return false;
};

export const resolveExternalPathDecision = (input: {
  toolName: string;
  callId?: string;
  domain: PermissionDecisionInfo['domain'];
  targets: string[];
  vaultRoot?: string;
  authorizedPaths: string[];
}): PermissionDecisionInfo | null => {
  if (input.domain !== 'read' && input.domain !== 'edit') {
    return null;
  }
  const fsTargets = input.targets
    .map((target) => ({ raw: target, absolutePath: extractFsAbsolutePath(target) }))
    .filter((item): item is { raw: string; absolutePath: string } => item.absolutePath !== null);
  if (fsTargets.length === 0) {
    return null;
  }

  const normalizedVaultRoot = input.vaultRoot ? normalizeComparablePath(input.vaultRoot) : null;
  const externalFsTargets = fsTargets.filter((item) =>
    normalizedVaultRoot ? !isPathWithinRoot(item.absolutePath, normalizedVaultRoot) : true
  );
  if (externalFsTargets.length === 0) {
    return null;
  }

  const allowlist = input.authorizedPaths.map((item) => normalizeComparablePath(item));
  const allAuthorized = externalFsTargets.every((item) =>
    isAuthorizedExternalPath(item.absolutePath, allowlist)
  );
  if (allAuthorized) {
    return {
      toolName: input.toolName,
      callId: input.callId,
      domain: input.domain,
      targets: externalFsTargets.map((item) => item.raw),
      decision: 'allow',
      rulePattern: 'external_path_authorized',
    };
  }
  return {
    toolName: input.toolName,
    callId: input.callId,
    domain: input.domain,
    targets: externalFsTargets.map((item) => item.raw),
    decision: 'deny',
    rulePattern: 'external_path_unapproved',
  };
};

export const getRuleEvaluationTargets = (
  targets: string[],
  externalDecision: PermissionDecisionInfo | null
): string[] => {
  if (
    !externalDecision ||
    externalDecision.decision !== 'allow' ||
    externalDecision.rulePattern !== 'external_path_authorized'
  ) {
    return targets;
  }
  const authorizedExternalTargets = new Set(externalDecision.targets);
  return targets.filter((target) => !authorizedExternalTargets.has(target));
};

export const applyFullAccessOverride = (
  info: PermissionDecisionInfo,
  mode: AgentAccessMode
): PermissionDecisionInfo => {
  if (mode !== 'full_access' || info.decision === 'allow') {
    return info;
  }
  // full_access 不得覆盖 Vault 外未授权路径边界。
  if (info.rulePattern === 'external_path_unapproved') {
    return info;
  }
  return {
    ...info,
    decision: 'allow',
    rule: undefined,
    rulePattern: 'full_access',
  };
};
