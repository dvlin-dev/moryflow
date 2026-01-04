import { useCallback, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { Uniwind, useUniwind } from 'uniwind';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = '@theme_preference';

const resolveSystemScheme = (): 'light' | 'dark' =>
  Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

/**
 * 主题管理 Hook
 * @returns {theme, colorScheme, setTheme, isLoading}
 */
export function useTheme() {
  // 用户偏好设置（system/light/dark）
  const [theme, setThemeState] = useState<Theme>('system');
  const [isLoading, setIsLoading] = useState(true);

  // uniwind: 使用 useUniwind() 作为 colorScheme 的唯一数据源
  // 这确保了当 Uniwind.setTheme() 被调用时，所有使用 useTheme() 的组件都会重新渲染
  const { theme: uniwindTheme } = useUniwind();
  const colorScheme: 'light' | 'dark' = uniwindTheme === 'dark' ? 'dark' : 'light';

  const applyTheme = useCallback(
    async (nextTheme: Theme, { persist = true }: { persist?: boolean } = {}) => {
      setThemeState(nextTheme);

      // uniwind: 使用 Uniwind.setTheme() 设置主题
      const resolved = nextTheme === 'system' ? resolveSystemScheme() : nextTheme;
      try {
        Uniwind.setTheme(resolved);
      } catch (error) {
        console.error('[Theme] Failed to sync Uniwind theme:', error);
      }

      if (persist) {
        try {
          await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch (error) {
          console.error('Failed to save theme preference:', error);
        }
      }
    },
    []
  );

  // 加载保存的主题偏好
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'system' || saved === 'light' || saved === 'dark') {
          await applyTheme(saved, { persist: false });
        } else {
          await applyTheme('system', { persist: false });
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, [applyTheme]);

  // 系统主题变化监听（仅在跟随系统时生效）
  useEffect(() => {
    if (theme !== 'system') {
      return;
    }

    const subscription = Appearance.addChangeListener(({ colorScheme: systemScheme }) => {
      const resolved = systemScheme === 'dark' ? 'dark' : 'light';
      // 同步更新 uniwind 主题，这会触发 useUniwind() 更新
      Uniwind.setTheme(resolved);
    });

    return () => subscription.remove();
  }, [theme]);

  const setTheme = useCallback(
    async (nextTheme: Theme) => {
      await applyTheme(nextTheme);
    },
    [applyTheme]
  );

  return {
    theme,
    colorScheme,
    setTheme,
    isLoading,
  };
}
