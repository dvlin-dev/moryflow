/**
 * [PROVIDES]: Desktop Runtime JSONC 配置读取（仅暴露必要接口）
 * [DEPENDS]: node:fs, node:path, agents-runtime/runtime-config
 * [POS]: PC Agent Runtime 用户级配置入口（~/.moryflow/config.jsonc）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { promises as fs } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseRuntimeConfig, type AgentRuntimeConfig } from '@moryflow/agents-runtime';

const CONFIG_DIR = path.join(os.homedir(), '.moryflow');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.jsonc');

type RuntimeConfigStore = {
  getConfig: () => Promise<AgentRuntimeConfig>;
};

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

const readConfigFileSync = (): string => {
  try {
    return readFileSync(CONFIG_PATH, 'utf-8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
};

export const createDesktopRuntimeConfigStore = (): RuntimeConfigStore => {
  let cachedContent: string | null = null;
  let cachedConfig: AgentRuntimeConfig | null = null;

  const loadConfig = async (): Promise<AgentRuntimeConfig> => {
    const content = await readConfigFile();
    if (cachedContent !== null && content === cachedContent && cachedConfig) {
      return cachedConfig;
    }
    const { config, errors } = parseRuntimeConfig(content);
    if (errors.length > 0) {
      console.warn('[runtime-config] JSONC parse errors:', errors.join(', '));
    }
    cachedContent = content;
    cachedConfig = config;
    return config;
  };

  return {
    getConfig: loadConfig,
  };
};

const runtimeConfigStore = createDesktopRuntimeConfigStore();

export const getRuntimeConfig = (): Promise<AgentRuntimeConfig> => runtimeConfigStore.getConfig();

export const getRuntimeConfigSync = (): AgentRuntimeConfig => {
  const content = readConfigFileSync();
  const { config, errors } = parseRuntimeConfig(content);
  if (errors.length > 0) {
    console.warn('[runtime-config] JSONC parse errors:', errors.join(', '));
  }
  return config;
};
