/**
 * Digest Welcome Config Service
 *
 * [INPUT]: Welcome config update payload
 * [OUTPUT]: Welcome config (raw locale maps / resolved actions)
 * [POS]: Welcome 全局配置（enabled/defaultSlug/actions），被 public/admin controllers 调用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateWelcomeConfigInput, WelcomeActionInput } from '../dto';
import { Prisma } from '../../../generated/prisma-main/client';
import {
  normalizeLocale,
  parseAcceptLanguage,
  pickLocaleValue,
} from '../utils/welcome-i18n';

function resolveAction(action: WelcomeActionInput | null, locale?: string) {
  if (!action) return null;
  return {
    action: action.action,
    label: pickLocaleValue(action.labelByLocale, locale),
  };
}

@Injectable()
export class DigestWelcomeConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private defaultConfig(): UpdateWelcomeConfigInput {
    return {
      enabled: true,
      defaultSlug: 'welcome',
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
        defaultSlug: defaults.defaultSlug,
        primaryAction: defaults.primaryAction ?? undefined,
        secondaryAction: defaults.secondaryAction ?? undefined,
      },
    });
  }

  async getPublicConfig(params: { locale?: string; acceptLanguage?: string }) {
    const config = await this.getOrCreateConfig();
    const locale = params.locale
      ? normalizeLocale(params.locale)
      : parseAcceptLanguage(params.acceptLanguage);

    return {
      enabled: config.enabled,
      defaultSlug: config.defaultSlug,
      primaryAction: resolveAction(
        (config.primaryAction as WelcomeActionInput | null) ?? null,
        locale,
      ),
      secondaryAction: resolveAction(
        (config.secondaryAction as WelcomeActionInput | null) ?? null,
        locale,
      ),
    };
  }

  async getAdminConfig(): Promise<{
    enabled: boolean;
    defaultSlug: string;
    primaryAction: WelcomeActionInput | null;
    secondaryAction: WelcomeActionInput | null;
    updatedAt: Date;
  }> {
    const config = await this.getOrCreateConfig();
    return {
      enabled: config.enabled,
      defaultSlug: config.defaultSlug,
      primaryAction:
        (config.primaryAction as WelcomeActionInput | null) ?? null,
      secondaryAction:
        (config.secondaryAction as WelcomeActionInput | null) ?? null,
      updatedAt: config.updatedAt,
    };
  }

  async updateConfig(input: UpdateWelcomeConfigInput) {
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

    await this.prisma.digestWelcomeConfig.upsert({
      where: { id: 'welcome' },
      create: {
        id: 'welcome',
        enabled: input.enabled,
        defaultSlug: input.defaultSlug,
        primaryAction,
        secondaryAction,
      },
      update: {
        enabled: input.enabled,
        defaultSlug: input.defaultSlug,
        primaryAction,
        secondaryAction,
      },
    });

    return this.getAdminConfig();
  }
}
