/**
 * 语言管理 Hook
 */

import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useCallback, useState, useMemo } from 'react';
import type { UseLanguageReturn, SupportedLanguage, LanguageConfig } from '../core/types';
import { LANGUAGE_LIST, SUPPORTED_LANGUAGES } from '../core/constants';
import { isValidLanguage } from '../utils/validation';

/**
 * 增强的语言管理 Hook
 */
export function useLanguage(): UseLanguageReturn & {
  getLanguageInfo: (language: SupportedLanguage) => LanguageConfig;
  supportedLanguages: SupportedLanguage[];
} {
  const { i18n } = useI18nextTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const changeLanguage = useCallback(
    async (language: SupportedLanguage): Promise<void> => {
      if (!isValidLanguage(language) || language === i18n.language) {
        return;
      }

      setIsChanging(true);
      try {
        await i18n.changeLanguage(language);
        // 保存语言偏好（如果有存储实现）
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('moryflow_language', language);
        }
      } finally {
        setIsChanging(false);
      }
    },
    [i18n]
  );

  const getLanguageInfo = useCallback(
    (language: SupportedLanguage): LanguageConfig => {
      return SUPPORTED_LANGUAGES[language];
    },
    []
  );

  const supportedLanguages = useMemo(
    () => Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[],
    []
  );

  return {
    currentLanguage: i18n.language as SupportedLanguage,
    languages: LANGUAGE_LIST,
    changeLanguage,
    isChanging,
    getLanguageInfo,
    supportedLanguages,
  };
}