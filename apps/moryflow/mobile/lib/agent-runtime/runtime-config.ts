/**
 * [PROVIDES]: Mobile Runtime JSONC 配置读写（含容错降级）
 * [DEPENDS]: expo-file-system, agents-runtime/runtime-config/jsonc
 * [POS]: Mobile Agent Runtime 用户级配置入口（Paths.document/.moryflow/config.jsonc）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Directory, File, Paths } from 'expo-file-system';
import {
  parseRuntimeConfig,
  updateJsoncValue,
  type AgentAccessMode,
  type AgentRuntimeConfig,
} from '@moryflow/agents-runtime';

const CONFIG_DIR = Paths.join(Paths.document.uri, '.moryflow');
const CONFIG_PATH = Paths.join(CONFIG_DIR, 'config.jsonc');

type RuntimeConfigStore = {
  getConfig: () => Promise<AgentRuntimeConfig>;
  getGlobalMode: () => Promise<AgentAccessMode>;
  setGlobalMode: (mode: AgentAccessMode) => Promise<{
    changed: boolean;
    previousMode: AgentAccessMode;
    mode: AgentAccessMode;
  }>;
};

const ensureConfigDir = (): Directory => {
  const dir = new Directory(CONFIG_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
};

const readConfigFile = async (): Promise<string> => {
  try {
    const file = new File(CONFIG_PATH);
    if (!file.exists) {
      return '';
    }
    return await file.text();
  } catch (error) {
    console.warn('[runtime-config] failed to read config', error);
    return '';
  }
};

const writeConfigFile = async (content: string): Promise<void> => {
  ensureConfigDir();
  await new File(CONFIG_PATH).write(content);
};

const resolveGlobalMode = (config: AgentRuntimeConfig): AgentAccessMode =>
  config.mode?.global === 'full_access' ? 'full_access' : 'ask';

export const createMobileRuntimeConfigStore = (): RuntimeConfigStore => {
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
      const base = cachedContent ?? (await readConfigFile());
      const { config, errors } = parseRuntimeConfig(base);
      if (errors.length > 0) {
        console.warn('[runtime-config] JSONC parse errors:', errors.join(', '));
      }
      const previousMode = resolveGlobalMode(config);
      if (previousMode === normalizedMode) {
        return { changed: false, previousMode, mode: previousMode };
      }
      let updated = updateJsoncValue(base, ['agents', 'runtime', 'mode', 'global'], normalizedMode);
      // 零兼容：移除旧字段 mode.default，避免双事实源。
      updated = updateJsoncValue(updated, ['agents', 'runtime', 'mode', 'default'], undefined);
      await writeConfigFile(updated);
      const { config: nextConfig, errors: nextErrors } = parseRuntimeConfig(updated);
      if (nextErrors.length > 0) {
        console.warn('[runtime-config] JSONC parse errors:', nextErrors.join(', '));
      }
      const resolvedMode = resolveGlobalMode(nextConfig);
      cachedContent = updated;
      cachedConfig = nextConfig;
      return { changed: true, previousMode, mode: resolvedMode };
    },
  };
};

const runtimeConfigStore = createMobileRuntimeConfigStore();

export const getRuntimeConfig = (): Promise<AgentRuntimeConfig> => runtimeConfigStore.getConfig();
export const getGlobalPermissionMode = (): Promise<AgentAccessMode> =>
  runtimeConfigStore.getGlobalMode();
export const setGlobalPermissionMode = (mode: AgentAccessMode) =>
  runtimeConfigStore.setGlobalMode(mode);
