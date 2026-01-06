/**
 * Audio 模块类型定义
 */

import type en from './en'

/**
 * Audio 翻译键类型
 */
export type AudioTranslationKeys = keyof typeof en

/**
 * Audio 翻译内容类型
 */
export type AudioTranslations = typeof en