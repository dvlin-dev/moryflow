/**
 * [PROVIDES]: useTranslation
 * [DEPENDS]: react-i18next, ../core/types
 * [POS]: 通用翻译 Hook（类型安全）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/i18n/CLAUDE.md
 */

import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useCallback } from 'react';
import type {
  TranslationNamespace,
  TranslationKeys,
  InterpolationParams,
  UseTranslationReturn,
  TranslateFunction,
  SupportedLanguage,
} from '../core/types';

/**
 * 通用翻译 Hook
 * @param namespace - 翻译命名空间
 * @example
 * ```tsx
 * const { t } = useTranslation('auth');
 * t('signIn'); // 类型安全，自动补全
 * ```
 */
export function useTranslation<NS extends TranslationNamespace>(
  namespace: NS
): UseTranslationReturn<TranslationKeys<NS>> {
  const { t: originalT, ready, i18n } = useI18nextTranslation(namespace);

  // 简化的翻译函数
  const t = useCallback(
    (key: TranslationKeys<NS>, params?: InterpolationParams): string => {
      const translationKey = String(key);
      return params
        ? (originalT(translationKey, params) as string)
        : (originalT(translationKey) as string);
    },
    [originalT]
  ) as TranslateFunction<TranslationKeys<NS>>;

  return {
    t,
    ready,
    language: i18n.language as SupportedLanguage,
  };
}
