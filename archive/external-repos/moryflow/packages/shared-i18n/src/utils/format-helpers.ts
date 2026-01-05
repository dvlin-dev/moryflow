import { format, formatDistance } from 'date-fns';
import { getDateLocale, getDateFormat } from './date-locale';
import { getI18nInstance } from '../core/i18n';

/**
 * 格式化相对时间（智能）
 * 近期显示"刚刚"、"X分钟前"等，远期显示具体日期
 * @param date - 日期对象或字符串
 * @param options - 配置选项
 */
export function formatSmartRelativeTime(
  date: Date | string,
  options?: {
    namespace?: string;
    shortDateThreshold?: number; // 默认7天
  }
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    const i18nInstance = getI18nInstance();
    if (!i18nInstance) return '';

    const currentLanguage = i18nInstance.language;
    // const namespace = options?.namespace || 'common'; // Reserved for future use
    const threshold = options?.shortDateThreshold || 7;

    // 超过阈值天数，显示具体日期
    if (diffDays >= threshold) {
      const locale = getDateLocale(currentLanguage);
      const dateFormat = getDateFormat(currentLanguage, 'short');
      return format(dateObj, dateFormat, { locale });
    }

    // 否则显示相对时间
    const locale = getDateLocale(currentLanguage);
    return formatDistance(dateObj, now, {
      addSuffix: true,
      locale
    });
  } catch {
    return '';
  }
}

/**
 * 格式化日期
 * @param date - 日期对象或字符串
 * @param formatType - 格式类型
 */
export function formatDate(
  date: Date | string,
  formatType: 'short' | 'medium' | 'long' = 'medium'
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const i18nInstance = getI18nInstance();
    const currentLanguage = i18nInstance?.language || 'en';

    const locale = getDateLocale(currentLanguage);
    const dateFormat = getDateFormat(currentLanguage, formatType);

    return format(dateObj, dateFormat, { locale });
  } catch {
    return '';
  }
}

/**
 * 导出所有格式化工具
 */
export const formatHelpers = {
  formatSmartRelativeTime,
  formatDate,
};