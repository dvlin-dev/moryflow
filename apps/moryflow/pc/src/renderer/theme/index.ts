/**
 * [PROVIDES]: initThemeManager/previewTheme - 主题偏好读取与应用（Renderer）
 * [DEPENDS]: matchMedia, agentSettingsResource（AgentSettings.ui.theme）
 * [POS]: 统一处理 light/dark/system 主题切换与订阅
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { AgentUISettings } from '@shared/ipc';
import { agentSettingsResource } from '@/lib/agent-settings-resource';

export type ThemePreference = AgentUISettings['theme'];
export type ThemeMode = Extract<ThemePreference, 'light' | 'dark'>;

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

const getSystemMedia = () => window.matchMedia('(prefers-color-scheme: dark)');

const getSystemMode = (mediaQuery: MediaQueryList): ThemeMode =>
  mediaQuery.matches ? 'dark' : 'light';

const applyDocumentTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  if (!root) {
    return;
  }
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
  root.dataset.colorMode = mode;
};

/**
 * 预览主题（即时应用，不保存）
 * 用于设置弹窗中的实时预览效果
 */
export const previewTheme = (preference: ThemePreference) => {
  if (typeof window === 'undefined') return;
  const mediaQuery = getSystemMedia();
  const mode: ThemeMode = preference === 'system' ? getSystemMode(mediaQuery) : preference;
  applyDocumentTheme(mode);
};

export const initThemeManager = () => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const mediaQuery = getSystemMedia();
  let preference: ThemePreference = 'system';

  const computeMode = (): ThemeMode =>
    preference === 'system' ? getSystemMode(mediaQuery) : (preference as ThemeMode);

  const apply = () => {
    applyDocumentTheme(computeMode());
  };

  const syncPreference = (next?: ThemePreference | null, useDefault = false) => {
    if (isThemePreference(next)) {
      preference = next;
    } else if (useDefault) {
      // 仅在显式请求时才回退到 'system'（如初始化和 bootstrap）
      // 这样可以防止在更新非主题设置时意外重置主题
      preference = 'system';
    }
    // 如果 next 无效且 useDefault 为 false，保持当前主题不变
    apply();
  };

  const handleSystemChange = () => {
    if (preference === 'system') {
      apply();
    }
  };

  mediaQuery.addEventListener('change', handleSystemChange);
  syncPreference('system', true);

  const bootstrap = async () => {
    let bootstrapping = true;
    const disposeSettingsChange = agentSettingsResource.subscribe((settings) => {
      if (bootstrapping) return;
      syncPreference(settings?.ui?.theme);
    });
    try {
      const settings = await agentSettingsResource.load();
      syncPreference(settings?.ui?.theme, true);
    } catch {
      apply();
    } finally {
      bootstrapping = false;
    }
    return disposeSettingsChange;
  };

  let disposeResource: (() => void) | undefined;
  void bootstrap().then((dispose) => {
    disposeResource = dispose;
  });

  return () => {
    mediaQuery.removeEventListener('change', handleSystemChange);
    disposeResource?.();
  };
};
