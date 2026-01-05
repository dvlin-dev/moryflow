/**
 * 核心类型定义 - 完全类型安全
 */

import type { InitOptions } from 'i18next';

// 支持的语言
export type SupportedLanguage = 'en' | 'zh-CN' | 'ja' | 'de' | 'ar';

// 翻译命名空间
export type TranslationNamespace =
  | 'common'
  | 'auth'
  | 'chat'
  | 'note'
  | 'user'
  | 'settings'
  | 'validation'
  | 'error'
  | 'date'
  | 'status'
  | 'audio'
  | 'health'
  | 'membership'
  | 'workspace';

// 插值参数
export interface InterpolationParams {
  [key: string]: string | number | boolean | Date;
}

// 日期格式类型
export type DateFormatType =
  | 'short'
  | 'medium'
  | 'long'
  | 'full'
  | 'shortTime'
  | 'mediumTime'
  | 'shortDateTime'
  | 'mediumDateTime'
  | 'longDateTime';

// 数字格式选项
export type NumberFormatOptions = Intl.NumberFormatOptions;

// 语言配置
export interface LanguageConfig {
  readonly code: SupportedLanguage;
  readonly name: string;
  readonly nativeName: string;
  readonly flag: string;
  readonly dateLocale: string;
  readonly direction: 'ltr' | 'rtl';
}

// i18n 初始化配置
export interface I18nInitConfig {
  languageDetector?: LanguageDetectorModule; // 类型安全的语言检测器
  fallbackLanguage?: SupportedLanguage;
  debug?: boolean;
  interpolation?: InitOptions['interpolation'];
  react?: InitOptions['react'];
}

// 语言检测器模块接口 - 采用最小化方式避免复杂的i18next内部类型依赖
export interface LanguageDetectorModule {
  type: 'languageDetector';
  async?: boolean; // 支持异步检测
  // 简化init方法，实际使用中i18next会注入这些参数，我们不需要严格类型化
  init?: (...args: unknown[]) => void;
  detect?: () =>
    | string
    | readonly string[]
    | undefined
    | Promise<string | readonly string[] | undefined>;
  cacheUserLanguage?: (lng: string) => void;
}

// 翻译函数类型
export interface TranslateFunction<Keys extends string> {
  (key: Keys, params?: InterpolationParams): string;
}

// Hook 返回类型
export interface UseTranslationReturn<Keys extends string> {
  readonly t: TranslateFunction<Keys>;
  readonly ready: boolean;
  readonly language: SupportedLanguage;
}

export interface UseLanguageReturn {
  readonly currentLanguage: SupportedLanguage;
  readonly languages: readonly LanguageConfig[];
  readonly changeLanguage: (language: SupportedLanguage) => Promise<void>;
  readonly isChanging: boolean;
}

export interface UseFormatterReturn {
  readonly formatDate: (date: Date | string | number, format: DateFormatType) => string;
  readonly formatNumber: (num: number, options?: NumberFormatOptions) => string;
  readonly formatCurrency: (amount: number, currency?: string) => string;
  readonly formatPercent: (value: number, options?: Omit<NumberFormatOptions, 'style'>) => string;
  readonly formatRelativeTime: (date: Date | string | number) => string;
}

// 命名空间到翻译键的映射（将在实现中完善）
export interface TranslationNamespaceMap {
  common: import('../translations/common/types').CommonTranslationKeys;
  auth: import('../translations/auth/types').AuthTranslationKeys;
  chat: import('../translations/chat/types').ChatTranslationKeys;
  note: import('../translations/note/types').NoteTranslationKeys;
  user: import('../translations/user/types').UserTranslationKeys;
  settings: import('../translations/settings/types').SettingsTranslationKeys;
  validation: import('../translations/validation/types').ValidationTranslationKeys;
  error: import('../translations/error/types').ErrorTranslationKeys;
  date: import('../translations/date/types').DateTranslationKeys;
  status: import('../translations/status/types').StatusTranslationKeys;
  audio: import('../translations/audio/types').AudioTranslationKeys;
  health: import('../translations/health/types').HealthTranslationKeys;
  membership: import('../translations/membership/types').MembershipTranslationKeys;
  workspace: import('../translations/workspace/types').WorkspaceTranslationKeys;
}

// 从命名空间获取对应的键类型
export type TranslationKeys<NS extends TranslationNamespace> = TranslationNamespaceMap[NS];

// 综合 Hook 返回类型
export interface UseI18nReturn<Keys extends string>
  extends UseTranslationReturn<Keys>, UseLanguageReturn, UseFormatterReturn {}

// Provider Props
export interface I18nProviderProps {
  readonly children: React.ReactNode;
  readonly config?: I18nInitConfig;
}
