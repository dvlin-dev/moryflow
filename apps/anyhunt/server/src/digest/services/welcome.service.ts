/**
 * Digest Welcome Service
 *
 * [INPUT]: locale, welcome config update payload
 * [OUTPUT]: locale-resolved welcome config for public read
 * [POS]: WelcomeConfig 的读写与 locale fallback（/api/v1/digest/welcome）
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateWelcomeInput, WelcomeActionInput } from '../dto';
import { Prisma } from '../../../generated/prisma-main/client';

type LocaleRecord = Record<string, string>;

function normalizeLocale(value: string): string {
  return value.trim().replaceAll('_', '-');
}

function pickLocaleValue(record: LocaleRecord, locale?: string): string {
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

function resolveAction(action: WelcomeActionInput | null, locale?: string) {
  if (!action) return null;
  return {
    action: action.action,
    label: pickLocaleValue(action.labelByLocale, locale),
  };
}

function parseAcceptLanguage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // "en-US,en;q=0.9,zh-CN;q=0.8" -> "en-US"
  const first = value.split(',')[0]?.trim();
  if (!first) return undefined;
  const locale = first.split(';')[0]?.trim();
  if (!locale) return undefined;
  const normalized = normalizeLocale(locale);
  return normalized || undefined;
}

@Injectable()
export class DigestWelcomeService {
  constructor(private readonly prisma: PrismaService) {}

  private defaultConfig(): UpdateWelcomeInput {
    return {
      enabled: true,
      titleByLocale: { en: 'Welcome to Anyhunt' },
      contentMarkdownByLocale: {
        en: [
          '# Welcome to Anyhunt',
          '',
          'Any topic. AI hunts',
          '',
          'Start with **Explore topics** to find something you care about, then follow or create your own subscription.',
        ].join('\n'),
      },
      primaryAction: {
        labelByLocale: { en: 'Explore topics' },
        action: 'openExplore',
      },
      secondaryAction: null,
    };
  }

  async getOrCreateConfig() {
    const existing = await this.prisma.digestWelcomeConfig.findUnique({
      where: { id: 'welcome' },
    });
    if (existing) return existing;

    const defaults = this.defaultConfig();
    return this.prisma.digestWelcomeConfig.create({
      data: {
        id: 'welcome',
        enabled: defaults.enabled,
        titleByLocale: defaults.titleByLocale,
        contentMarkdownByLocale: defaults.contentMarkdownByLocale,
        primaryAction: defaults.primaryAction ?? undefined,
        secondaryAction: defaults.secondaryAction ?? undefined,
      },
    });
  }

  async getPublicWelcome(params: {
    locale?: string;
    acceptLanguage?: string;
  }): Promise<{
    enabled: boolean;
    title: string;
    contentMarkdown: string;
    primaryAction: {
      label: string;
      action: 'openExplore' | 'openSignIn';
    } | null;
    secondaryAction: {
      label: string;
      action: 'openExplore' | 'openSignIn';
    } | null;
  }> {
    const config = await this.getOrCreateConfig();
    const locale = params.locale
      ? normalizeLocale(params.locale)
      : parseAcceptLanguage(params.acceptLanguage);

    return {
      enabled: config.enabled,
      title: pickLocaleValue(config.titleByLocale as LocaleRecord, locale),
      contentMarkdown: pickLocaleValue(
        config.contentMarkdownByLocale as LocaleRecord,
        locale,
      ),
      primaryAction: resolveAction(
        config.primaryAction as WelcomeActionInput | null,
        locale,
      ),
      secondaryAction: resolveAction(
        config.secondaryAction as WelcomeActionInput | null,
        locale,
      ),
    };
  }

  async getAdminWelcome(): Promise<{
    enabled: boolean;
    titleByLocale: LocaleRecord;
    contentMarkdownByLocale: LocaleRecord;
    primaryAction: WelcomeActionInput | null;
    secondaryAction: WelcomeActionInput | null;
    updatedAt: Date;
  }> {
    const config = await this.getOrCreateConfig();
    return {
      enabled: config.enabled,
      titleByLocale: config.titleByLocale as LocaleRecord,
      contentMarkdownByLocale: config.contentMarkdownByLocale as LocaleRecord,
      primaryAction:
        (config.primaryAction as WelcomeActionInput | null) ?? null,
      secondaryAction:
        (config.secondaryAction as WelcomeActionInput | null) ?? null,
      updatedAt: config.updatedAt,
    };
  }

  async updateWelcome(input: UpdateWelcomeInput) {
    const primaryAction =
      input.primaryAction === undefined
        ? undefined
        : input.primaryAction === null
          ? Prisma.DbNull
          : input.primaryAction;
    const secondaryAction =
      input.secondaryAction === undefined
        ? undefined
        : input.secondaryAction === null
          ? Prisma.DbNull
          : input.secondaryAction;

    return this.prisma.digestWelcomeConfig.upsert({
      where: { id: 'welcome' },
      create: {
        id: 'welcome',
        enabled: input.enabled,
        titleByLocale: input.titleByLocale,
        contentMarkdownByLocale: input.contentMarkdownByLocale,
        primaryAction,
        secondaryAction,
      },
      update: {
        enabled: input.enabled,
        titleByLocale: input.titleByLocale,
        contentMarkdownByLocale: input.contentMarkdownByLocale,
        primaryAction,
        secondaryAction,
      },
    });
  }
}
