/**
 * [PROVIDES]: Desktop Permission 规则 JSONC 存储
 * [DEPENDS]: node:fs, node:path, agents-runtime/jsonc
 * [POS]: PC Agent Runtime 的用户级权限规则持久化
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  isPermissionRule,
  parseJsonc,
  updateJsoncValue,
  type PermissionRule,
} from '@anyhunt/agents-runtime';

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

export type DesktopPermissionRuleStore = {
  getRules: () => Promise<PermissionRule[]>;
  appendRules: (rules: PermissionRule[]) => Promise<PermissionRule[]>;
};

export const createDesktopPermissionRuleStore = (): DesktopPermissionRuleStore => {
  let cachedRules: PermissionRule[] | null = null;
  let cachedContent: string | null = null;

  const loadRules = async (): Promise<PermissionRule[]> => {
    if (cachedRules !== null) return cachedRules;
    const content = await readConfigFile();
    const { data, errors } = parseJsonc(content);
    if (errors.length > 0) {
      console.warn('[permission] JSONC parse errors:', errors.join(', '));
    }
    cachedContent = content;
    cachedRules = extractRules(data);
    return cachedRules;
  };

  const persistRules = async (rules: PermissionRule[]): Promise<PermissionRule[]> => {
    const base = cachedContent ?? (await readConfigFile());
    const updated = updateJsoncValue(base, ['agents', 'runtime', 'permission', 'rules'], rules);
    await writeConfigFile(updated);
    cachedContent = updated;
    cachedRules = rules;
    return rules;
  };

  return {
    async getRules() {
      return loadRules();
    },
    async appendRules(rules) {
      if (rules.length === 0) {
        return loadRules();
      }
      const existing = await loadRules();
      return persistRules([...existing, ...rules]);
    },
  };
};
