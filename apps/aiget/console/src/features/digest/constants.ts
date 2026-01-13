/**
 * Digest Constants
 *
 * [PROVIDES]: Shared constants for digest feature
 * [POS]: Constants for cron presets, timezones, locales
 */

// Cron schedule presets
export const CRON_PRESETS = [
  { label: 'Weekly (Monday 8am)', value: '0 8 * * 1' },
  { label: 'Daily (8am)', value: '0 8 * * *' },
  { label: 'Twice daily (8am, 6pm)', value: '0 8,18 * * *' },
  { label: 'Weekdays (8am)', value: '0 8 * * 1-5' },
] as const;

// Common timezones
export const TIMEZONES = [
  { label: 'Pacific (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'Mountain (Denver)', value: 'America/Denver' },
  { label: 'Central (Chicago)', value: 'America/Chicago' },
  { label: 'Eastern (New York)', value: 'America/New_York' },
  { label: 'UTC', value: 'UTC' },
  { label: 'China (Shanghai)', value: 'Asia/Shanghai' },
  { label: 'Japan (Tokyo)', value: 'Asia/Tokyo' },
  { label: 'UK (London)', value: 'Europe/London' },
  { label: 'Germany (Berlin)', value: 'Europe/Berlin' },
] as const;

// Default subscription values
export const DEFAULT_SUBSCRIPTION = {
  cron: '0 8 * * 1',
  timezone: 'America/Los_Angeles',
  outputLocale: 'en',
  minItems: 5,
  searchLimit: 60,
} as const;

/**
 * Get cron preset label by value
 */
export function getCronLabel(cron: string): string {
  return CRON_PRESETS.find((p) => p.value === cron)?.label ?? cron;
}
