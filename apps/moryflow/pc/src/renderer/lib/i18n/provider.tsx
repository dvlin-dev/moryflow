/**
 * [PROPS]: { children } - 子组件
 * [EMITS]: none
 * [POS]: 根级 Provider，包装应用并初始化 i18n
 */

import * as React from 'react'
import { I18nextProvider } from 'react-i18next'
import { initI18nSync, getI18nInstance, type SupportedLanguage } from '@anyhunt/i18n'
import { createPCLanguageDetector } from './language-detector'

/** PC 端回退到英文 */
const FALLBACK_LANGUAGE: SupportedLanguage = 'en'

/** 确保只初始化一次 */
let initialized = false

function ensureInit() {
  if (initialized) return
  initI18nSync({
    languageDetector: createPCLanguageDetector(),
    fallbackLanguage: FALLBACK_LANGUAGE,
    debug: import.meta.env.DEV,
    react: { useSuspense: false },
  })
  initialized = true
}

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  // 同步初始化，确保 i18n 实例可用
  ensureInit()
  const i18n = getI18nInstance()
  if (!i18n) {
    // 理论上不会发生，因为 ensureInit 已经初始化
    return <>{children}</>
  }
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
