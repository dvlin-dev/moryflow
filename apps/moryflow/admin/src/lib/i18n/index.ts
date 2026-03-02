/**
 * [PROVIDES]: Admin 端 i18n 统一导出
 * [DEPENDS]: @moryflow/i18n, ./provider
 * [POS]: 应用内 i18n 入口（hooks + provider）
 */

export { I18nProvider } from './provider';

export {
  useTranslation,
  useLanguage,
  getI18nInstance,
  isI18nInitialized,
  type SupportedLanguage,
  type TranslationNamespace,
  type LanguageConfig,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_LIST,
  getDateLocale,
  formatDate,
  formatSmartRelativeTime,
} from '@moryflow/i18n';
