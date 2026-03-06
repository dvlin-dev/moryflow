/**
 * i18n Provider 组件
 * 使用新的 shared-i18n 包
 */
import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from './init';
import { getI18nInstance } from '@moryflow/i18n';
import { View, ActivityIndicator } from 'react-native';

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * i18n Provider - 负责初始化和提供 i18n 上下文
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [i18nInstance, setI18nInstance] = useState(() => getI18nInstance());

  useEffect(() => {
    const initialize = () => {
      try {
        if (!i18nInstance) {
          const instance = initI18n();
          setI18nInstance(instance);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        // 即使失败也要设置为已初始化，避免应用卡在加载状态
        setIsInitialized(true);
      }
    };

    initialize();
  }, [i18nInstance]);

  if (!isInitialized || !i18nInstance) {
    // 显示加载指示器
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}
