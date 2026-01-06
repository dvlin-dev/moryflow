/**
 * i18n 初始化逻辑
 */
import {
  initI18nSync,
  DEFAULT_LANGUAGE,
} from '@moryflow/shared-i18n'
import { createNativeLanguageDetector } from './language-detector'

/**
 * 初始化 i18n（同步版本）
 */
export const initI18n = () => {
  return initI18nSync({
    languageDetector: createNativeLanguageDetector(),
    fallbackLanguage: DEFAULT_LANGUAGE,
    debug: __DEV__,
    react: {
      useSuspense: false,
    },
  })
}
