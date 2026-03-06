/**
 * [PROVIDES]: createPCLanguageDetector - PC 端语言检测器
 * [DEPENDS]: localStorage, navigator.language
 * [POS]: 为 Electron 环境提供语言检测和持久化能力
 */

import type { LanguageDetectorModule, SupportedLanguage } from '@moryflow/i18n';

const STORAGE_KEY = 'moryflow_language';

/** 回退语言 - PC 端默认英文 */
const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

/** 支持的语言列表 */
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'zh-CN', 'ja', 'de', 'ar'];

/**
 * 验证语言是否受支持
 */
function isValidLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * 从系统语言标签映射到支持的语言
 * 例如: 'zh-Hans-CN' -> 'zh-CN', 'en-US' -> 'en'
 */
function mapSystemLanguage(systemLang: string): SupportedLanguage | null {
  // 精确匹配
  if (isValidLanguage(systemLang)) {
    return systemLang;
  }

  const lang = systemLang.toLowerCase();

  // 中文处理
  if (lang.startsWith('zh')) {
    return 'zh-CN';
  }

  // 英语处理
  if (lang.startsWith('en')) {
    return 'en';
  }

  // 日语处理
  if (lang.startsWith('ja')) {
    return 'ja';
  }

  // 德语处理
  if (lang.startsWith('de')) {
    return 'de';
  }

  // 阿拉伯语处理
  if (lang.startsWith('ar')) {
    return 'ar';
  }

  return null;
}

/**
 * 创建 PC 端语言检测器
 */
export function createPCLanguageDetector(): LanguageDetectorModule {
  return {
    type: 'languageDetector',
    async: false,

    detect(): string {
      // 1. 尝试从 localStorage 读取用户偏好
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && isValidLanguage(stored)) {
          return stored;
        }
      } catch {
        // localStorage 不可用
      }

      // 2. 尝试从浏览器/系统语言检测
      const browserLang = navigator.language || navigator.languages?.[0];
      if (browserLang) {
        const mapped = mapSystemLanguage(browserLang);
        if (mapped) {
          return mapped;
        }
      }

      // 3. 回退到英文
      return FALLBACK_LANGUAGE;
    },

    cacheUserLanguage(lng: string): void {
      try {
        if (isValidLanguage(lng)) {
          localStorage.setItem(STORAGE_KEY, lng);
        }
      } catch {
        // 忽略存储错误
      }
    },
  };
}
