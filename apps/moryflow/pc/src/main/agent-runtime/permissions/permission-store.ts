/**
 * [PROVIDES]: Desktop Permission 规则 JSONC 存储
 * [DEPENDS]: agents-runtime/jsonc, config-file-store
 * [POS]: PC Agent Runtime 的用户级权限规则持久化
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import {
  EMPTY_TOOL_POLICY,
  isPermissionRule,
  isToolPolicy,
  normalizeToolPolicy,
  parseJsonc,
  toolPolicyRuleToDsl,
  updateJsoncValue,
  type PermissionRule,
  type ToolPolicy,
  type ToolPolicyRule,
} from '@moryflow/agents-runtime';
import { readDesktopConfigFile, updateDesktopConfigFile } from '../config-file-store.js';

const extractRules = (data: unknown): PermissionRule[] => {
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const agents = record.agents as Record<string, unknown> | undefined;
  const runtime = agents?.runtime as Record<string, unknown> | undefined;
  const permission = runtime?.permission as Record<string, unknown> | undefined;
  const rules = permission?.rules as unknown[] | undefined;
  if (!Array.isArray(rules)) return [];
  return rules.filter(isPermissionRule);
};

const extractToolPolicy = (data: unknown): ToolPolicy => {
  if (!data || typeof data !== 'object') return EMPTY_TOOL_POLICY;
  const record = data as Record<string, unknown>;
  const agents = record.agents as Record<string, unknown> | undefined;
  const runtime = agents?.runtime as Record<string, unknown> | undefined;
  const permission = runtime?.permission as Record<string, unknown> | undefined;
  const toolPolicy = permission?.toolPolicy;
  if (!isToolPolicy(toolPolicy)) {
    return EMPTY_TOOL_POLICY;
  }
  return normalizeToolPolicy(toolPolicy);
};

const extractLegacyTopLevelToolPolicy = (data: unknown): ToolPolicy | null => {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (!isToolPolicy(record.toolPolicy)) {
    return null;
  }
  return normalizeToolPolicy(record.toolPolicy);
};

export type DesktopPermissionRuleStore = {
  getRules: () => Promise<PermissionRule[]>;
  appendRules: (rules: PermissionRule[]) => Promise<PermissionRule[]>;
  getToolPolicy: () => Promise<ToolPolicy>;
  appendAllowRule: (rule: ToolPolicyRule) => Promise<ToolPolicy>;
};

export const createDesktopPermissionRuleStore = (): DesktopPermissionRuleStore => {
  let cachedRules: PermissionRule[] | null = null;
  let cachedToolPolicy: ToolPolicy | null = null;
  let cachedContent: string | null = null;

  const loadPermissionConfig = async (): Promise<{
    rules: PermissionRule[];
    toolPolicy: ToolPolicy;
  }> => {
    const content = await readDesktopConfigFile();
    if (
      cachedContent !== null &&
      content === cachedContent &&
      cachedRules !== null &&
      cachedToolPolicy !== null
    ) {
      return {
        rules: cachedRules,
        toolPolicy: cachedToolPolicy,
      };
    }

    const { data, errors } = parseJsonc(content);
    if (errors.length > 0) {
      console.warn('[permission] JSONC parse errors:', errors.join(', '));
    }
    cachedContent = content;
    const extractedRules = extractRules(data);
    const normalizedRules = extractedRules.filter((rule) => rule.decision !== 'deny');
    const extractedToolPolicy = extractToolPolicy(data);
    const legacyToolPolicy = extractLegacyTopLevelToolPolicy(data);
    const mergedToolPolicy = normalizeToolPolicy({
      allow: [...(extractedToolPolicy.allow ?? []), ...(legacyToolPolicy?.allow ?? [])],
    });

    const shouldPersistNormalizedConfig =
      normalizedRules.length !== extractedRules.length || legacyToolPolicy !== null;
    if (shouldPersistNormalizedConfig) {
      const persisted = await persistPermissionConfig({
        rules: normalizedRules,
        toolPolicy: mergedToolPolicy,
      });
      return persisted;
    }

    cachedRules = normalizedRules;
    cachedToolPolicy = mergedToolPolicy;
    return {
      rules: normalizedRules,
      toolPolicy: mergedToolPolicy,
    };
  };

  const persistPermissionConfig = async (input: {
    rules: PermissionRule[];
    toolPolicy: ToolPolicy;
  }): Promise<{ rules: PermissionRule[]; toolPolicy: ToolPolicy }> => {
    const normalizedToolPolicy = normalizeToolPolicy(input.toolPolicy);
    const updated = await updateDesktopConfigFile((base) => {
      let next = updateJsoncValue(base, ['agents', 'runtime', 'permission', 'rules'], input.rules);
      next = updateJsoncValue(
        next,
        ['agents', 'runtime', 'permission', 'toolPolicy'],
        normalizedToolPolicy
      );
      // 零兼容：清理旧顶层 toolPolicy，避免多事实源。
      return updateJsoncValue(next, ['toolPolicy'], undefined);
    });

    cachedContent = updated;
    cachedRules = input.rules;
    cachedToolPolicy = normalizedToolPolicy;
    return {
      rules: cachedRules,
      toolPolicy: cachedToolPolicy,
    };
  };

  return {
    async getRules() {
      const config = await loadPermissionConfig();
      return config.rules;
    },
    async appendRules(rules) {
      if (rules.length === 0) {
        const config = await loadPermissionConfig();
        return config.rules;
      }
      const existing = await loadPermissionConfig();
      const persisted = await persistPermissionConfig({
        rules: [...existing.rules, ...rules],
        toolPolicy: existing.toolPolicy,
      });
      return persisted.rules;
    },
    async getToolPolicy() {
      const config = await loadPermissionConfig();
      return config.toolPolicy;
    },
    async appendAllowRule(rule) {
      const existing = await loadPermissionConfig();
      const signatureSet = new Set(
        existing.toolPolicy.allow.map((item) => toolPolicyRuleToDsl(item))
      );
      const nextRuleSignature = toolPolicyRuleToDsl(rule);
      if (signatureSet.has(nextRuleSignature)) {
        return existing.toolPolicy;
      }
      const persisted = await persistPermissionConfig({
        rules: existing.rules,
        toolPolicy: {
          allow: [...existing.toolPolicy.allow, rule],
        },
      });
      return persisted.toolPolicy;
    },
  };
};
