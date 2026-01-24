/**
 * [PROVIDES]: 支持语言、默认命名空间与运行时常量
 * [DEPENDS]: ./types
 * [POS]: i18n 常量与默认配置
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/i18n/CLAUDE.md
 */

import type { SupportedLanguage, LanguageConfig, TranslationNamespace } from './types';

// 支持的语言配置
export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dateLocale: 'enUS',
    direction: 'ltr',
  },
  'zh-CN': {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    flag: '🇨🇳',
    dateLocale: 'zhCN',
    direction: 'ltr',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dateLocale: 'ja',
    direction: 'ltr',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dateLocale: 'de',
    direction: 'ltr',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dateLocale: 'ar',
    direction: 'rtl',
  },
} as const;

// 获取所有语言配置数组
export const LANGUAGE_LIST = Object.values(SUPPORTED_LANGUAGES);

// 默认语言
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN';

// 默认命名空间
export const DEFAULT_NAMESPACE: TranslationNamespace = 'common';

// 后备语言
export const FALLBACK_LANGUAGE: SupportedLanguage = 'zh-CN';

// 存储键名
export const LANGUAGE_STORAGE_KEY = 'moryflow_language';

// 开发环境标志（兼容 React Native）
declare const __DEV__: boolean | undefined;
export const IS_DEV =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
