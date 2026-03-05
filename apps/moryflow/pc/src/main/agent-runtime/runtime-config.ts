/**
 * [PROVIDES]: Desktop Runtime JSONC 配置读取（仅暴露必要接口）
 * [DEPENDS]: node:fs, node:path, agents-runtime/runtime-config
 * [POS]: PC Agent Runtime 用户级配置入口（~/.moryflow/config.jsonc）
 * [UPDATE]: 2026-03-05 - 新增全局权限模式读写（agents.runtime.mode.global）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseRuntimeConfig,
  updateJsoncValue,
  type AgentAccessMode,
  type AgentRuntimeConfig,
} from '@moryflow/agents-runtime';

const CONFIG_DIR = path.join(os.homedir(), '.moryflow');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.jsonc');

type RuntimeConfigStore = {
  getConfig: () => Promise<AgentRuntimeConfig>;
  getGlobalMode: () => Promise<AgentAccessMode>;
  setGlobalMode: (mode: AgentAccessMode) => Promise<{
    changed: boolean;
    previousMode: AgentAccessMode;
    mode: AgentAccessMode;
  }>;
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

const writeConfigFile = async (content: string): Promise<void> => {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const tmpPath = `${CONFIG_PATH}.${randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, CONFIG_PATH);
};

const resolveGlobalMode = (config: AgentRuntimeConfig): AgentAccessMode =>
  config.mode?.global === 'full_access' ? 'full_access' : 'ask';

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
    async getGlobalMode() {
      const config = await loadConfig();
      return resolveGlobalMode(config);
    },
    async setGlobalMode(mode) {
      const normalizedMode: AgentAccessMode = mode === 'full_access' ? 'full_access' : 'ask';
      const config = await loadConfig();
      const previousMode = resolveGlobalMode(config);
      if (previousMode === normalizedMode) {
        return { changed: false, previousMode, mode: normalizedMode };
      }
      const base = cachedContent ?? (await readConfigFile());
      let updated = updateJsoncValue(base, ['agents', 'runtime', 'mode', 'global'], normalizedMode);
      // 零兼容：移除旧字段 mode.default，避免多事实源。
      updated = updateJsoncValue(updated, ['agents', 'runtime', 'mode', 'default'], undefined);
      await writeConfigFile(updated);

      const { config: nextConfig, errors } = parseRuntimeConfig(updated);
      if (errors.length > 0) {
        console.warn('[runtime-config] JSONC parse errors:', errors.join(', '));
      }
      cachedContent = updated;
      cachedConfig = nextConfig;
      return { changed: true, previousMode, mode: resolveGlobalMode(nextConfig) };
    },
  };
};

const runtimeConfigStore = createDesktopRuntimeConfigStore();

export const getRuntimeConfig = (): Promise<AgentRuntimeConfig> => runtimeConfigStore.getConfig();
export const getGlobalPermissionMode = (): Promise<AgentAccessMode> =>
  runtimeConfigStore.getGlobalMode();
export const setGlobalPermissionMode = (mode: AgentAccessMode) =>
  runtimeConfigStore.setGlobalMode(mode);

export const getRuntimeConfigSync = (): AgentRuntimeConfig => {
  const content = readConfigFileSync();
  const { config, errors } = parseRuntimeConfig(content);
  if (errors.length > 0) {
    console.warn('[runtime-config] JSONC parse errors:', errors.join(', '));
  }
  return config;
};

export const getGlobalPermissionModeSync = (): AgentAccessMode =>
  resolveGlobalMode(getRuntimeConfigSync());
