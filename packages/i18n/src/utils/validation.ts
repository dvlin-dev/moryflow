/**
 * [PROVIDES]: isValidLanguage
 * [DEPENDS]: ../core/constants
 * [POS]: i18n 语言校验工具
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { SupportedLanguage } from '../core/types';
import { SUPPORTED_LANGUAGES } from '../core/constants';

/**
 * 检查是否为有效的语言代码
 */
export function isValidLanguage(code: string): code is SupportedLanguage {
  return code in SUPPORTED_LANGUAGES;
}
