/**
 * Digest Welcome (Admin) Utils
 *
 * [PROVIDES]: draft cloning + locale helpers + slug helper
 * [POS]: DigestWelcomePage.tsx 的纯函数工具（避免 page 文件过大）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type {
  DigestWelcomeConfig,
  DigestWelcomePage,
  UpdateWelcomeConfigInput,
  UpdateWelcomePageInput,
  WelcomeAction,
} from '@/features/digest-welcome';
import type { LocaleRecord } from '@/features/digest-welcome/shared';

export function cloneConfigDraft(config: DigestWelcomeConfig): UpdateWelcomeConfigInput {
  return {
    enabled: config.enabled,
    defaultSlug: config.defaultSlug,
    primaryAction: config.primaryAction ? { ...config.primaryAction } : null,
    secondaryAction: config.secondaryAction ? { ...config.secondaryAction } : null,
  };
}

export function clonePageDraft(page: DigestWelcomePage): UpdateWelcomePageInput {
  return {
    slug: page.slug,
    enabled: page.enabled,
    sortOrder: page.sortOrder,
    titleByLocale: { ...(page.titleByLocale as LocaleRecord) },
    contentMarkdownByLocale: { ...(page.contentMarkdownByLocale as LocaleRecord) },
  };
}

export function collectLocales(pageDraft: UpdateWelcomePageInput | null): string[] {
  const keys = new Set<string>(['en']);
  if (pageDraft) {
    Object.keys(pageDraft.titleByLocale ?? {}).forEach((k) => keys.add(k));
    Object.keys(pageDraft.contentMarkdownByLocale ?? {}).forEach((k) => keys.add(k));
  }
  return Array.from(keys);
}

export function collectActionLocales(configDraft: UpdateWelcomeConfigInput | null): string[] {
  const keys = new Set<string>(['en']);
  if (!configDraft) return Array.from(keys);

  const primary = configDraft.primaryAction?.labelByLocale ?? {};
  const secondary = configDraft.secondaryAction?.labelByLocale ?? {};

  Object.keys(primary).forEach((k) => keys.add(k));
  Object.keys(secondary).forEach((k) => keys.add(k));

  return Array.from(keys);
}

export function ensureLocaleRecordValue(record: LocaleRecord, locale: string): LocaleRecord {
  if (record[locale] !== undefined) return record;
  return { ...record, [locale]: '' };
}

export function ensureActionLocaleValue(
  action: WelcomeAction | null,
  locale: string
): WelcomeAction | null {
  if (!action) return null;
  return {
    ...action,
    labelByLocale: ensureLocaleRecordValue(action.labelByLocale, locale),
  };
}

export function toSlug(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'welcome-page';
}
