/**
 * i18n 核心初始化模块
 */

import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { I18nInitConfig } from './types';
import { FALLBACK_LANGUAGE, DEFAULT_NAMESPACE } from './constants';
import translations from '../translations';

// 全局 i18n 实例
let globalI18nInstance: I18nInstance | null = null;

/**
 * 初始化 i18n（异步）
 */
export async function initI18n(config: I18nInitConfig = {}): Promise<I18nInstance> {
  if (globalI18nInstance && globalI18nInstance.isInitialized) {
    return globalI18nInstance;
  }

  const instance = i18next.createInstance();

  // 添加插件
  if (config.languageDetector) {
    instance.use(config.languageDetector);
  }
  instance.use(initReactI18next);

  // 初始化配置（异步）
  await instance.init({
    resources: translations,
    fallbackLng: config.fallbackLanguage ?? FALLBACK_LANGUAGE,
    defaultNS: DEFAULT_NAMESPACE,
    ns: Object.keys(translations.en),
    debug: config.debug ?? false,
    interpolation: {
      escapeValue: false, // React 已处理 XSS
      ...config.interpolation,
    },
    react: {
      useSuspense: false,
      ...config.react,
    },
  });

  globalI18nInstance = instance;
  return instance;
}

/**
 * 同步初始化 i18n（兼容旧代码）
 */
export function initI18nSync(config: I18nInitConfig = {}): I18nInstance {
  if (globalI18nInstance && globalI18nInstance.isInitialized) {
    return globalI18nInstance;
  }

  const instance = i18next.createInstance();

  // 添加插件
  if (config.languageDetector) {
    instance.use(config.languageDetector);
  }
  instance.use(initReactI18next);

  // 同步初始化
  instance.init({
    resources: translations,
    fallbackLng: config.fallbackLanguage ?? FALLBACK_LANGUAGE,
    defaultNS: DEFAULT_NAMESPACE,
    ns: Object.keys(translations.en),
    debug: config.debug ?? false,
    interpolation: {
      escapeValue: false,
      ...config.interpolation,
    },
    react: {
      useSuspense: false,
      ...config.react,
    },
  });

  globalI18nInstance = instance;
  return instance;
}

/**
 * 获取 i18n 实例
 */
export function getI18nInstance(): I18nInstance | null {
  return globalI18nInstance;
}

/**
 * 检查是否已初始化
 */
export function isI18nInitialized(): boolean {
  return globalI18nInstance !== null && globalI18nInstance.isInitialized;
}