/**
 * [PROVIDES]: dashboard 展示格式化函数
 * [DEPENDS]: Intl APIs
 * [POS]: dashboard 视图层统一格式化入口
 */

export function formatDashboardNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function formatDashboardCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export function formatDashboardDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
