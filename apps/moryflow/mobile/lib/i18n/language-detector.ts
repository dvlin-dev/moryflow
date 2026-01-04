/**
 * React Native 语言检测器
 * 提供设备语言检测和用户语言偏好管理
 */
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import {
  type LanguageDetectorModule,
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from '@aiget/i18n';

const LANGUAGE_STORAGE_KEY = 'moryflow_language' as const;

/**
 * 验证语言是否被支持
 */
const isValidLanguage = (language: string): language is SupportedLanguage => {
  return language in SUPPORTED_LANGUAGES;
};

/**
 * 从系统语言检测最匹配的支持语言
 */
const detectLanguageFromSystem = (): SupportedLanguage => {
  try {
    const systemLocale = Localization.getLocales()[0]?.languageTag || DEFAULT_LANGUAGE;

    // 直接匹配完整语言代码
    if (isValidLanguage(systemLocale)) {
      return systemLocale;
    }

    // 匹配语言前缀
    const langPrefix = systemLocale.substring(0, 2).toLowerCase();
    const supportedLanguages = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[];

    for (const lang of supportedLanguages) {
      if (lang.toLowerCase().startsWith(langPrefix)) {
        return lang;
      }
    }

    return DEFAULT_LANGUAGE;
  } catch (error) {
    console.warn('Failed to detect system language:', error);
    return DEFAULT_LANGUAGE;
  }
};

/**
 * 安全地读取存储的语言偏好
 */
const getStoredLanguage = async (): Promise<SupportedLanguage | null> => {
  try {
    const storedLanguage = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    return storedLanguage && isValidLanguage(storedLanguage) ? storedLanguage : null;
  } catch (error) {
    console.warn('Failed to read stored language:', error);
    return null;
  }
};

/**
 * 安全地保存语言偏好
 */
const saveLanguage = async (language: SupportedLanguage): Promise<void> => {
  try {
    await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language preference:', error);
  }
};

/**
 * 创建原生语言检测器
 */
export function createNativeLanguageDetector(): LanguageDetectorModule {
  return {
    type: 'languageDetector',
    async: true,
    detect: async (): Promise<SupportedLanguage> => {
      // 优先使用存储的用户偏好
      const storedLanguage = await getStoredLanguage();
      if (storedLanguage) {
        return storedLanguage;
      }

      // 回退到系统语言检测
      return detectLanguageFromSystem();
    },
    cacheUserLanguage: (language: string): void => {
      // 验证并异步保存语言
      if (isValidLanguage(language)) {
        saveLanguage(language).catch((error) => {
          console.warn('Failed to cache user language:', error);
        });
      }
    },
  };
}

/**
 * 保存语言偏好（公开API）
 */
export const saveLanguagePreference = saveLanguage;

/**
 * 获取语言偏好（公开API）
 */
export const getLanguagePreference = getStoredLanguage;