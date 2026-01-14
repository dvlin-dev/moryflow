/**
 * [PROVIDES]: 主题切换 hook
 * [POS]: 管理浅色/深色/跟随系统主题
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'aiget-theme';

/**
 * 获取系统主题偏好
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 应用主题到 DOM
 */
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
}

/**
 * 主题切换 hook
 *
 * 支持三种模式：
 * - light: 浅色模式
 * - dark: 深色模式
 * - system: 跟随系统
 *
 * @example
 * ```tsx
 * const { theme, setTheme, resolvedTheme } = useTheme();
 *
 * // 获取当前设置
 * console.log(theme); // 'light' | 'dark' | 'system'
 *
 * // 获取实际应用的主题
 * console.log(resolvedTheme); // 'light' | 'dark'
 *
 * // 切换主题
 * setTheme('dark');
 * ```
 */
export function useTheme() {
  // 初始化时从 localStorage 读取，默认 system
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored || 'system';
  });

  // 计算实际主题
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return theme === 'system' ? getSystemTheme() : theme;
  });

  // 设置主题
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    setResolvedTheme(newTheme === 'system' ? getSystemTheme() : newTheme);
  }, []);

  // 初始化时应用主题
  useEffect(() => {
    applyTheme(theme);
    setResolvedTheme(theme === 'system' ? getSystemTheme() : theme);
  }, [theme]);

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme('system');
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    /** 当前主题设置 */
    theme,
    /** 设置主题 */
    setTheme,
    /** 实际应用的主题（解析 system 后的结果） */
    resolvedTheme,
  };
}
