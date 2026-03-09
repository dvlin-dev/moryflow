/**
 * [PROVIDES]: i18n 初始化、Hooks、翻译资源与工具函数
 * [DEPENDS]: ./core, ./hooks, ./translations, ./utils
 * [POS]: @moryflow/i18n 包入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

// 类型
export type {
  SupportedLanguage,
  TranslationNamespace,
  TranslationKeys,
  InterpolationParams,
  TranslateFunction,
  UseTranslationReturn,
  UseLanguageReturn,
  DateFormatType,
  NumberFormatOptions,
  LanguageConfig,
  I18nInitConfig,
  LanguageDetectorModule,
} from './core/types';
export type { HealthTranslationKeys } from './translations/health/types';

// 常量
export {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LIST,
  DEFAULT_LANGUAGE,
  DEFAULT_NAMESPACE,
} from './core/constants';

// 初始化
export { initI18n, initI18nSync, getI18nInstance, isI18nInitialized } from './core/i18n';

// Hooks
export { useTranslation } from './hooks/useTranslation';
export { useLanguage } from './hooks/useLanguage';

// 翻译资源
export { default as translations } from './translations';

// 工具函数
export { getDateLocale, getDateFormat, dateLocaleUtils } from './utils/date-locale';
export { formatSmartRelativeTime, formatDate, formatHelpers } from './utils/format-helpers';
