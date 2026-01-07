/**
 * [PROVIDES]: Date/time formatting helpers for UI
 * [DEPENDS]: date-fns
 * [POS]: Shared UI utilities (console/admin/www)
 *
 * 用户可见：输出英文文案（默认）
 */

import { formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

export type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'number') {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }
  if (typeof value === 'string') {
    // Prefer ISO parse, fall back to Date constructor
    const iso = parseISO(value);
    if (isValid(iso)) return iso;
    const date = new Date(value);
    return isValid(date) ? date : null;
  }
  return null;
}

/**
 * Format a date/time to a relative string like "3 minutes ago".
 */
export function formatRelativeTime(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '-';
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/**
 * Returns true if the given date/time is in the past.
 */
export function isExpired(value: DateInput): boolean {
  const date = toDate(value);
  if (!date) return false;
  return date.getTime() < Date.now();
}

/**
 * Returns true if the given date/time is within the next N days (default 7).
 */
export function isExpiringSoon(value: DateInput, days: number = 7): boolean {
  const date = toDate(value);
  if (!date) return false;
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return false;
  return diffMs <= days * 24 * 60 * 60 * 1000;
}

