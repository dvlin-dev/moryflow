/**
 * [PROVIDES]: 权限判定纯函数（Vault 内外边界 + full_access 覆盖规则）
 * [DEPENDS]: agents-runtime types, agents-sandbox path utils
 * [POS]: permission-runtime 可测试的无副作用逻辑
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import path from 'node:path';
import type { AgentAccessMode, PermissionDecisionInfo } from '@moryflow/agents-runtime';
import { isPathEqualOrWithin, normalizeAuthorizedPath } from '@moryflow/agents-sandbox';

const extractFsAbsolutePath = (target: string): string | null => {
  if (!target.startsWith('fs:')) return null;
  const raw = target.slice('fs:'.length).trim();
  if (!raw || !path.isAbsolute(raw)) return null;
  return normalizeAuthorizedPath(raw);
};

const isPathWithinRoot = (absolutePath: string, rootPath: string): boolean => {
  return isPathEqualOrWithin(absolutePath, rootPath);
};

const isAuthorizedExternalPath = (absolutePath: string, allowlist: string[]): boolean => {
  for (const pathEntry of allowlist) {
    if (isPathEqualOrWithin(absolutePath, pathEntry)) return true;
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

  const normalizedVaultRoot = input.vaultRoot ? normalizeAuthorizedPath(input.vaultRoot) : null;
  const externalFsTargets = fsTargets.filter((item) =>
    normalizedVaultRoot ? !isPathWithinRoot(item.absolutePath, normalizedVaultRoot) : true
  );
  if (externalFsTargets.length === 0) {
    return null;
  }

  const allowlist = input.authorizedPaths.map((item) => normalizeAuthorizedPath(item));
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
    decision: 'ask',
    rulePattern: 'external_path_unapproved',
  };
};

export const getRuleEvaluationTargets = (
  targets: string[],
  externalDecision: PermissionDecisionInfo | null
): string[] => {
  if (!externalDecision) {
    return targets;
  }
  const externalTargets = new Set(externalDecision.targets);
  return targets.filter((target) => !externalTargets.has(target));
};

export const applyFullAccessOverride = (
  info: PermissionDecisionInfo,
  mode: AgentAccessMode
): PermissionDecisionInfo => {
  if (mode !== 'full_access' || info.decision === 'allow') {
    return info;
  }
  return {
    ...info,
    decision: 'allow',
    rule: undefined,
    rulePattern: 'full_access',
  };
};
