/**
 * [PROVIDES]: Mobile Runtime JSONC 配置读取（含容错降级）
 * [DEPENDS]: expo-file-system, agents-runtime/runtime-config
 * [POS]: Mobile Agent Runtime 用户级配置入口（Paths.document/.moryflow/config.jsonc）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { File, Paths } from 'expo-file-system';
import { parseRuntimeConfig, type AgentRuntimeConfig } from '@anyhunt/agents-runtime';

const CONFIG_DIR = Paths.join(Paths.document.uri, '.moryflow');
const CONFIG_PATH = Paths.join(CONFIG_DIR, 'config.jsonc');

type RuntimeConfigStore = {
  getConfig: () => Promise<AgentRuntimeConfig>;
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
  };
};

const runtimeConfigStore = createMobileRuntimeConfigStore();

export const getRuntimeConfig = (): Promise<AgentRuntimeConfig> => runtimeConfigStore.getConfig();
