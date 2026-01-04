/**
 * Mobile i18n 初始化和配置
 * 使用新的 shared-i18n 包
 */
import { getI18nInstance } from '@aiget/i18n'

// 导出初始化函数
export { initI18n } from './init'

export default getI18nInstance

// 导出 Provider
export { I18nProvider } from './provider';

// 导出Hooks - 使用 shared-i18n 的通用 hooks
export {
  useTranslation,
  useLanguage,
} from '@aiget/i18n';

// 导出类型
export type {
  TranslationNamespace,
  TranslationKeys,
  InterpolationParams,
  SupportedLanguage,
} from '@aiget/i18n';