/**
 * [PROVIDES]: PC 端 i18n 模块统一导出
 * [DEPENDS]: @aiget/i18n, local modules
 * [POS]: 入口文件，供组件导入使用
 */

// Provider 组件
export { I18nProvider } from './provider'

// 从共享包重新导出所有 hooks 和工具
export {
  // Hooks
  useTranslation,
  useLanguage,
  // 实例访问
  getI18nInstance,
  isI18nInitialized,
  // 类型
  type SupportedLanguage,
  type TranslationNamespace,
  type LanguageConfig,
  // 常量
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_LIST,
  // 工具函数
  getDateLocale,
  formatDate,
  formatSmartRelativeTime,
} from '@aiget/i18n'
