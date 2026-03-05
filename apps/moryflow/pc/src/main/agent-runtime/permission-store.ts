/**
 * [PROVIDES]: Desktop Permission 规则 JSONC 存储
 * [DEPENDS]: node:fs, node:path, agents-runtime/jsonc
 * [POS]: PC Agent Runtime 的用户级权限规则持久化
 * [UPDATE]: 2026-03-05 - 新增 toolPolicy.allow 读写（同类 allow 持久化）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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

const CONFIG_DIR = path.join(os.homedir(), '.moryflow');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.jsonc');

const readConfigFile = async (): Promise<string> => {
  try {
    return await fs.readFile(CONFIG_PATH, 'utf-8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
};

const writeConfigFile = async (content: string): Promise<void> => {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const tmpPath = `${CONFIG_PATH}.${randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, CONFIG_PATH);
};

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
    if (cachedRules !== null && cachedToolPolicy !== null) {
      return {
        rules: cachedRules,
        toolPolicy: cachedToolPolicy,
      };
    }
    const content = await readConfigFile();
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
    const base = cachedContent ?? (await readConfigFile());
    let updated = updateJsoncValue(base, ['agents', 'runtime', 'permission', 'rules'], input.rules);
    updated = updateJsoncValue(
      updated,
      ['agents', 'runtime', 'permission', 'toolPolicy'],
      normalizeToolPolicy(input.toolPolicy)
    );
    // 零兼容：清理旧顶层 toolPolicy，避免多事实源。
    updated = updateJsoncValue(updated, ['toolPolicy'], undefined);
    await writeConfigFile(updated);
    cachedContent = updated;
    cachedRules = input.rules;
    cachedToolPolicy = normalizeToolPolicy(input.toolPolicy);
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
