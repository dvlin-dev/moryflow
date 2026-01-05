/**
 * 验证工具函数
 */

import type { SupportedLanguage } from '../core/types';
import { SUPPORTED_LANGUAGES } from '../core/constants';

/**
 * 检查是否为有效的语言代码
 */
export function isValidLanguage(code: string): code is SupportedLanguage {
  return code in SUPPORTED_LANGUAGES;
}
