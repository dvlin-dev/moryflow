/**
 * [PROVIDES]: agentSettingsResource - AgentSettings 单飞缓存与订阅（Renderer 侧）
 * [DEPENDS]: desktopAPI.agent.getSettings/onSettingsChange
 * [POS]: 统一收敛 getSettings 调用，避免重复 IPC 导致设置弹窗卡 Loading
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { AgentSettings } from '@shared/ipc';

type Listener = (settings: AgentSettings) => void;

let cached: AgentSettings | null = null;
let inflight: Promise<AgentSettings> | null = null;
let subscribed = false;
let disposeIpcSubscription: (() => void) | null = null;

const listeners = new Set<Listener>();

const notify = (settings: AgentSettings) => {
  for (const listener of listeners) {
    listener(settings);
  }
};

const ensureSubscribed = () => {
  if (subscribed) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }
  const api = window.desktopAPI?.agent;
  if (!api?.onSettingsChange) {
    return;
  }
  subscribed = true;
  disposeIpcSubscription = api.onSettingsChange((next: AgentSettings) => {
    cached = next;
    notify(next);
  });
};

const fetchSettings = async (): Promise<AgentSettings> => {
  if (typeof window === 'undefined') {
    throw new Error('desktopAPI is not available');
  }
  const api = window.desktopAPI?.agent;
  if (!api?.getSettings) {
    throw new Error('desktopAPI.agent.getSettings is not available');
  }
  const next = (await api.getSettings()) as AgentSettings;
  cached = next;
  notify(next);
  return next;
};

const loadSettings = async (options?: { preferCache?: boolean }): Promise<AgentSettings> => {
  ensureSubscribed();

  const preferCache = options?.preferCache !== false;
  if (preferCache && cached) {
    return cached;
  }
  if (inflight) {
    return inflight;
  }

  inflight = fetchSettings().finally(() => {
    inflight = null;
  });
  return inflight;
};

const refreshSettings = async (): Promise<AgentSettings> => {
  return loadSettings({ preferCache: false });
};

export const agentSettingsResource = {
  getCached(): AgentSettings | null {
    ensureSubscribed();
    return cached;
  },

  /**
   * 加载设置（单飞）。
   * - preferCache=true 时若已有缓存会直接返回，避免无意义 IPC
   */
  load: loadSettings,

  refresh: refreshSettings,

  /**
   * 订阅设置变化（包含 IPC 推送与本地 load/refresh 完成时的更新）。
   * 如果已有缓存会立即触发一次，便于 UI 快速渲染。
   */
  subscribe: (listener: Listener) => {
    ensureSubscribed();
    listeners.add(listener);
    if (cached) {
      listener(cached);
    }
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * 仅用于测试：释放 IPC 订阅并清空缓存。
   */
  __unsafeResetForTests: () => {
    disposeIpcSubscription?.();
    disposeIpcSubscription = null;
    subscribed = false;
    cached = null;
    inflight = null;
    listeners.clear();
  },
};
