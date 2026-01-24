/**
 * [PROVIDES]: isValidLanguage
 * [DEPENDS]: ../core/constants
 * [POS]: i18n 语言校验工具
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/i18n/CLAUDE.md
 */

import type { SupportedLanguage } from '../core/types';
import { SUPPORTED_LANGUAGES } from '../core/constants';

/**
 * 检查是否为有效的语言代码
 */
export function isValidLanguage(code: string): code is SupportedLanguage {
  return code in SUPPORTED_LANGUAGES;
}
