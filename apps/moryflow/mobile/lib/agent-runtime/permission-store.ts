/**
 * [PROVIDES]: Mobile Permission 规则 JSONC 存储
 * [DEPENDS]: expo-file-system, agents-runtime/jsonc
 * [POS]: Mobile Agent Runtime 用户级权限规则持久化
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Directory, File, Paths } from 'expo-file-system';
import {
  isPermissionRule,
  parseJsonc,
  updateJsoncValue,
  type PermissionRule,
} from '@anyhunt/agents-runtime';

const CONFIG_DIR = Paths.join(Paths.document.uri, '.moryflow');
const CONFIG_PATH = Paths.join(CONFIG_DIR, 'config.jsonc');

const ensureConfigDir = (): Directory => {
  const dir = new Directory(CONFIG_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
};

const readConfigFile = async (): Promise<string> => {
  const file = new File(CONFIG_PATH);
  if (!file.exists) {
    return '';
  }
  return file.text();
};

const writeConfigFile = (content: string): void => {
  ensureConfigDir();
  new File(CONFIG_PATH).write(content);
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

export type MobilePermissionRuleStore = {
  getRules: () => Promise<PermissionRule[]>;
  appendRules: (rules: PermissionRule[]) => Promise<PermissionRule[]>;
};

export const createMobilePermissionRuleStore = (): MobilePermissionRuleStore => {
  let cachedRules: PermissionRule[] | null = null;
  let cachedContent: string | null = null;

  const loadRules = async (): Promise<PermissionRule[]> => {
    if (cachedRules) return cachedRules;
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
    writeConfigFile(updated);
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
