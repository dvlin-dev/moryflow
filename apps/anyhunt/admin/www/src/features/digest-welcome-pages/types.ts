/**
 * Digest Welcome Pages Types (Admin)
 *
 * [DEFINES]: DigestWelcomePage, CreateWelcomePageInput, UpdateWelcomePageInput, ReorderWelcomePagesInput
 * [USED_BY]: digest-welcome-pages/api.ts, digest-welcome-pages/hooks.ts
 */

import type { LocaleRecord } from '../digest-welcome/shared';

export interface DigestWelcomePage {
  id: string;
  slug: string;
  enabled: boolean;
  sortOrder: number;
  titleByLocale: LocaleRecord;
  contentMarkdownByLocale: LocaleRecord;
  updatedAt: string;
}

export interface CreateWelcomePageInput {
  slug: string;
  enabled: boolean;
  sortOrder?: number;
  titleByLocale: LocaleRecord;
  contentMarkdownByLocale: LocaleRecord;
}

export interface UpdateWelcomePageInput {
  slug: string;
  enabled: boolean;
  sortOrder: number;
  titleByLocale: LocaleRecord;
  contentMarkdownByLocale: LocaleRecord;
}

export interface ReorderWelcomePagesInput {
  ids: string[];
}
