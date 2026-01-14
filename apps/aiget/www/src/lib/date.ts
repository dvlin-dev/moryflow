/**
 * Date formatting utilities
 *
 * [PROVIDES]: formatDate, formatRelativeTime
 * [USED_BY]: ArticleDetail, ArticleCard, RunHistoryTab
 * [POS]: Shared date formatting functions
 */

/**
 * Format a date string as a localized date/time string
 * Example: "Jan 1, 2025, 9:00 AM"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date string as relative time
 * Examples: "just now", "5m ago", "2h ago", "3d ago"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
