/**
 * Digest Welcome i18n Utils
 *
 * [PROVIDES]: normalizeLocale, parseAcceptLanguage, pickLocaleValue
 * [POS]: Welcome（config/pages）多处复用的 locale 解析与 fallback 逻辑
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type LocaleRecord = Record<string, string>;

export function normalizeLocale(value: string): string {
  return value.trim().replaceAll('_', '-');
}

export function parseAcceptLanguage(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  const first = value.split(',')[0]?.trim();
  if (!first) return undefined;
  const locale = first.split(';')[0]?.trim();
  if (!locale) return undefined;
  const normalized = normalizeLocale(locale);
  return normalized || undefined;
}

export function pickLocaleValue(record: LocaleRecord, locale?: string): string {
  const entries = Object.entries(record);
  if (entries.length === 0) return '';

  const lower = new Map(entries.map(([k, v]) => [k.toLowerCase(), v]));

  const candidates: string[] = [];
  if (locale) {
    const normalized = normalizeLocale(locale);
    candidates.push(normalized, normalized.split('-')[0]);
  }
  candidates.push('en');

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (!lower.has(key)) continue;
    return lower.get(key) ?? '';
  }

  return entries[0]?.[1] ?? '';
}
