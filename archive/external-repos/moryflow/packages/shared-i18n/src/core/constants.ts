/**
 * 国际化常量定义
 */

import type { SupportedLanguage, LanguageConfig, TranslationNamespace } from './types';

// 支持的语言配置
export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  'en': {
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
  'ja': {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dateLocale: 'ja',
    direction: 'ltr',
  },
  'de': {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dateLocale: 'de',
    direction: 'ltr',
  },
  'ar': {
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

// 语言 Cookie 名称（Web 端使用）
export const LANGUAGE_COOKIE_NAME = 'moryflow_lang';

// HTTP 请求头
export const ACCEPT_LANGUAGE_HEADER = 'accept-language';
export const CONTENT_LANGUAGE_HEADER = 'content-language';

// 语言检测顺序（Web 端使用）
export const LANGUAGE_DETECTION_ORDER = [
  'querystring',
  'cookie',
  'localStorage',
  'sessionStorage',
  'navigator',
  'htmlTag',
] as const;

// 日期格式化模式 - 英文
export const DATE_FORMAT_PATTERNS_EN = {
  short: 'MM/dd/yyyy',
  medium: 'MMM dd, yyyy',
  long: 'MMMM dd, yyyy',
  full: 'EEEE, MMMM dd, yyyy',
  shortTime: 'HH:mm',
  mediumTime: 'HH:mm:ss',
  shortDateTime: 'MM/dd/yyyy HH:mm',
  mediumDateTime: 'MMM dd, yyyy HH:mm',
  longDateTime: 'MMMM dd, yyyy HH:mm:ss',
} as const;

// 日期格式化模式 - 中文
export const DATE_FORMAT_PATTERNS_ZH = {
  short: 'yyyy/MM/dd',
  medium: 'yyyy年MM月dd日',
  long: 'yyyy年MM月dd日',
  full: 'yyyy年MM月dd日 EEEE',
  shortTime: 'HH:mm',
  mediumTime: 'HH:mm:ss',
  shortDateTime: 'yyyy/MM/dd HH:mm',
  mediumDateTime: 'yyyy年MM月dd日 HH:mm',
  longDateTime: 'yyyy年MM月dd日 HH:mm:ss',
} as const;

// 日期格式化模式 - 日文
export const DATE_FORMAT_PATTERNS_JA = {
  short: 'yyyy/MM/dd',
  medium: 'yyyy年MM月dd日',
  long: 'yyyy年MM月dd日',
  full: 'yyyy年MM月dd日 EEEE',
  shortTime: 'HH:mm',
  mediumTime: 'HH:mm:ss',
  shortDateTime: 'yyyy/MM/dd HH:mm',
  mediumDateTime: 'yyyy年MM月dd日 HH:mm',
  longDateTime: 'yyyy年MM月dd日 HH:mm:ss',
} as const;

// 日期格式化模式 - 德文
export const DATE_FORMAT_PATTERNS_DE = {
  short: 'dd.MM.yyyy',
  medium: 'dd. MMM yyyy',
  long: 'dd. MMMM yyyy',
  full: 'EEEE, dd. MMMM yyyy',
  shortTime: 'HH:mm',
  mediumTime: 'HH:mm:ss',
  shortDateTime: 'dd.MM.yyyy HH:mm',
  mediumDateTime: 'dd. MMM yyyy HH:mm',
  longDateTime: 'dd. MMMM yyyy HH:mm:ss',
} as const;

// 日期格式化模式 - 阿拉伯文
export const DATE_FORMAT_PATTERNS_AR = {
  short: 'dd/MM/yyyy',
  medium: 'dd MMM yyyy',
  long: 'dd MMMM yyyy',
  full: 'EEEE dd MMMM yyyy',
  shortTime: 'HH:mm',
  mediumTime: 'HH:mm:ss',
  shortDateTime: 'dd/MM/yyyy HH:mm',
  mediumDateTime: 'dd MMM yyyy HH:mm',
  longDateTime: 'dd MMMM yyyy HH:mm:ss',
} as const;

// 货币代码映射
export const CURRENCY_CODES: Record<SupportedLanguage, string> = {
  'en': 'USD',
  'zh-CN': 'CNY',
  'ja': 'JPY',
  'de': 'EUR',
  'ar': 'SAR',
};

// 插值占位符模式
export const INTERPOLATION_PATTERN = /\{\{(\w+)\}\}/g;

// 命名空间分隔符
export const NAMESPACE_SEPARATOR = '.';

// 开发环境标志（兼容 React Native）
declare const __DEV__: boolean | undefined;
export const IS_DEV = typeof __DEV__ !== 'undefined'
  ? __DEV__
  : process.env.NODE_ENV === 'development';