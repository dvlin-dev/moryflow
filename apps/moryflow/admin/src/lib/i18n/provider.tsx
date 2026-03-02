/**
 * [PROPS]: { children } - 子组件
 * [EMITS]: None
 * [POS]: Admin 根级 i18n Provider（初始化并注入 i18next 实例）
 */

import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { getI18nInstance, initI18nSync, type SupportedLanguage } from '@moryflow/i18n';
import { createAdminLanguageDetector } from './language-detector';

const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

let initialized = false;

function ensureInit() {
  if (initialized) return;

  initI18nSync({
    languageDetector: createAdminLanguageDetector(),
    fallbackLanguage: FALLBACK_LANGUAGE,
    debug: import.meta.env.DEV,
    react: { useSuspense: false },
  });

  initialized = true;
}

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  ensureInit();
  const i18n = getI18nInstance();

  if (!i18n) {
    return <>{children}</>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
