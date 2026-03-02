/**
 * [PROVIDES]: createAdminLanguageDetector - Admin 端语言检测器
 * [DEPENDS]: localStorage, navigator.language
 * [POS]: 为 Web Admin 提供语言检测与持久化能力
 */

import type { LanguageDetectorModule, SupportedLanguage } from '@moryflow/i18n';

const STORAGE_KEY = 'moryflow_admin_language';
const FALLBACK_LANGUAGE: SupportedLanguage = 'en';
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'zh-CN', 'ja', 'de', 'ar'];

function isValidLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

function mapSystemLanguage(language: string): SupportedLanguage | null {
  if (isValidLanguage(language)) {
    return language;
  }

  const normalized = language.toLowerCase();

  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('ar')) return 'ar';

  return null;
}

export function createAdminLanguageDetector(): LanguageDetectorModule {
  return {
    type: 'languageDetector',
    async: false,
    detect(): string {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && isValidLanguage(stored)) {
          return stored;
        }
      } catch {
        // ignore storage read errors
      }

      const browserLanguage = navigator.language || navigator.languages?.[0];
      if (browserLanguage) {
        const mapped = mapSystemLanguage(browserLanguage);
        if (mapped) {
          return mapped;
        }
      }

      return FALLBACK_LANGUAGE;
    },
    cacheUserLanguage(language: string): void {
      try {
        if (isValidLanguage(language)) {
          localStorage.setItem(STORAGE_KEY, language);
        }
      } catch {
        // ignore storage write errors
      }
    },
  };
}
