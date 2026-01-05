import { Locale } from 'date-fns';
import { zhCN, enUS, ja, de, ar } from 'date-fns/locale';

/**
 * 日期库locale映射表
 * 支持中、英、日、德、阿拉伯文
 */
const DATE_LOCALE_MAP: Record<string, Locale> = {
  'zh-CN': zhCN,
  en: enUS,
  ja: ja,
  de: de,
  ar: ar,
};

/**
 * 获取date-fns的locale对象
 * @param language - 语言代码
 * @returns date-fns的Locale对象
 */
export function getDateLocale(language: string = 'en'): Locale {
  // 优先精确匹配
  if (DATE_LOCALE_MAP[language]) {
    return DATE_LOCALE_MAP[language];
  }

  // 尝试匹配语言主代码（如 en-GB -> en）
  const primaryLang = language.split('-')[0];
  if (DATE_LOCALE_MAP[primaryLang]) {
    return DATE_LOCALE_MAP[primaryLang];
  }

  // 默认返回英文
  return enUS;
}

/**
 * 获取日期格式模板
 * 根据不同语言返回合适的日期格式
 */
export function getDateFormat(
  language: string = 'en',
  type:
    | 'short'
    | 'medium'
    | 'long'
    | 'full'
    | 'shortTime'
    | 'mediumTime'
    | 'shortDateTime'
    | 'mediumDateTime'
    | 'longDateTime' = 'medium'
): string {
  const formats: Record<string, Record<string, string>> = {
    'zh-CN': {
      short: 'yyyy/MM/dd',
      medium: 'yyyy年MM月dd日',
      long: 'yyyy年MM月dd日',
      full: 'yyyy年MM月dd日 EEEE',
      shortTime: 'HH:mm',
      mediumTime: 'HH:mm:ss',
      shortDateTime: 'yyyy/MM/dd HH:mm',
      mediumDateTime: 'yyyy年MM月dd日 HH:mm',
      longDateTime: 'yyyy年MM月dd日 HH:mm:ss',
    },
    ja: {
      short: 'yyyy/MM/dd',
      medium: 'yyyy年MM月dd日',
      long: 'yyyy年MM月dd日',
      full: 'yyyy年MM月dd日 EEEE',
      shortTime: 'HH:mm',
      mediumTime: 'HH:mm:ss',
      shortDateTime: 'yyyy/MM/dd HH:mm',
      mediumDateTime: 'yyyy年MM月dd日 HH:mm',
      longDateTime: 'yyyy年MM月dd日 HH:mm:ss',
    },
    de: {
      short: 'dd.MM.yyyy',
      medium: 'dd. MMM yyyy',
      long: 'dd. MMMM yyyy',
      full: 'EEEE, dd. MMMM yyyy',
      shortTime: 'HH:mm',
      mediumTime: 'HH:mm:ss',
      shortDateTime: 'dd.MM.yyyy HH:mm',
      mediumDateTime: 'dd. MMM yyyy HH:mm',
      longDateTime: 'dd. MMMM yyyy HH:mm:ss',
    },
    ar: {
      short: 'dd/MM/yyyy',
      medium: 'dd MMM yyyy',
      long: 'dd MMMM yyyy',
      full: 'EEEE dd MMMM yyyy',
      shortTime: 'HH:mm',
      mediumTime: 'HH:mm:ss',
      shortDateTime: 'dd/MM/yyyy HH:mm',
      mediumDateTime: 'dd MMM yyyy HH:mm',
      longDateTime: 'dd MMMM yyyy HH:mm:ss',
    },
    default: {
      short: 'MM/dd/yyyy',
      medium: 'MMM dd, yyyy',
      long: 'MMMM dd, yyyy',
      full: 'EEEE, MMMM dd, yyyy',
      shortTime: 'HH:mm',
      mediumTime: 'HH:mm:ss',
      shortDateTime: 'MM/dd/yyyy HH:mm',
      mediumDateTime: 'MMM dd, yyyy HH:mm',
      longDateTime: 'MMMM dd, yyyy HH:mm:ss',
    },
  };

  // 获取对应语言的格式，如果没有则使用默认格式
  const langFormats = formats[language] || formats['default'];
  return langFormats[type];
}

/**
 * 导出工具函数
 */
export const dateLocaleUtils = {
  getDateLocale,
  getDateFormat,
};
