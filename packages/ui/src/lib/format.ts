/**
 * 格式化日期
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions & { locale?: string }
): string {
  const { locale = 'en-US', ...formatOptions } = options ?? {};
  const d = new Date(date);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...formatOptions,
  }).format(d);
}

/**
 * 格式化日期时间
 */
export function formatDateTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions & { locale?: string }
): string {
  const { locale = 'en-US', ...formatOptions } = options ?? {};
  const d = new Date(date);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...formatOptions,
  }).format(d);
}

/**
 * 格式化货币（美分转美元）
 */
export function formatCurrency(cents: number, currency: string = 'USD'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化数字（添加千分位）
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(
  date: Date | string | number | null,
  fallback: string = 'Never'
): string {
  if (!date) return fallback;
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  return formatDate(d);
}

/**
 * 检查日期是否即将过期（7天内）
 */
export function isExpiringSoon(
  expiresAt: Date | string | null,
  daysThreshold: number = 7
): boolean {
  if (!expiresAt) return false;
  const expiresDate = new Date(expiresAt);
  const now = new Date();
  const diffDays = (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= daysThreshold && diffDays > 0;
}

/**
 * 检查日期是否已过期
 */
export function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
