/**
 * [PROVIDES]: Desktop Runtime JSONC 配置读取（仅暴露必要接口）
 * [DEPENDS]: agents-runtime/runtime-config, config-file-store
 * [POS]: PC Agent Runtime 用户级配置入口（~/.moryflow/config.jsonc）
 * [UPDATE]: 2026-03-05 - 新增全局权限模式读写（agents.runtime.mode.global）
 * [UPDATE]: 2026-03-05 - 配置写入统一走串行化更新，避免跨模块写覆盖
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  parseRuntimeConfig,
  updateJsoncValue,
  type AgentAccessMode,
  type AgentRuntimeConfig,
} from '@moryflow/agents-runtime';
import {
  readDesktopConfigFile,
  readDesktopConfigFileSync,
  updateDesktopConfigFile,
} from './config-file-store.js';

export type RuntimeConfigStore = {
  getConfig: () => Promise<AgentRuntimeConfig>;
  getGlobalMode: () => Promise<AgentAccessMode>;
  setGlobalMode: (mode: AgentAccessMode) => Promise<{
    changed: boolean;
    previousMode: AgentAccessMode;
    mode: AgentAccessMode;
  }>;
};

const resolveGlobalMode = (config: AgentRuntimeConfig): AgentAccessMode =>
  config.mode?.global === 'full_access' ? 'full_access' : 'ask';

export const createDesktopRuntimeConfigStore = (): RuntimeConfigStore => {
  let cachedContent: string | null = null;
  let cachedConfig: AgentRuntimeConfig | null = null;

  const loadConfig = async (): Promise<AgentRuntimeConfig> => {
    const content = await readDesktopConfigFile();
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
      let changed = false;
      let previousMode: AgentAccessMode = 'ask';

      const updated = await updateDesktopConfigFile((base) => {
        const { config, errors } = parseRuntimeConfig(base);
        if (errors.length > 0) {
          console.warn('[runtime-config] JSONC parse errors:', errors.join(', '));
        }
        previousMode = resolveGlobalMode(config);
        if (previousMode === normalizedMode) {
          changed = false;
          return base;
        }

        let next = updateJsoncValue(base, ['agents', 'runtime', 'mode', 'global'], normalizedMode);
        // 零兼容：移除旧字段 mode.default，避免多事实源。
        next = updateJsoncValue(next, ['agents', 'runtime', 'mode', 'default'], undefined);
        changed = true;
        return next;
      });

      const { config: nextConfig, errors } = parseRuntimeConfig(updated);
      if (errors.length > 0) {
        console.warn('[runtime-config] JSONC parse errors:', errors.join(', '));
      }
      cachedContent = updated;
      cachedConfig = nextConfig;
      const resolvedMode = resolveGlobalMode(nextConfig);
      return { changed, previousMode, mode: resolvedMode };
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
  const content = readDesktopConfigFileSync();
  const { config, errors } = parseRuntimeConfig(content);
  if (errors.length > 0) {
    console.warn('[runtime-config] JSONC parse errors:', errors.join(', '));
  }
  return config;
};

export const getGlobalPermissionModeSync = (): AgentAccessMode =>
  resolveGlobalMode(getRuntimeConfigSync());
