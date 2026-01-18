/**
 * Digest Welcome Pages Service
 *
 * [INPUT]: locale / slug / admin CRUD payload
 * [OUTPUT]: Welcome pages（list + detail，支持 locale fallback）
 * [POS]: Welcome 多页面内容源，被 public/admin controllers 调用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateWelcomePageInput, UpdateWelcomePageInput } from '../dto';
import { Prisma } from '../../../generated/prisma-main/client';
import type { LocaleRecord } from '../utils/welcome-i18n';
import {
  normalizeLocale,
  parseAcceptLanguage,
  pickLocaleValue,
} from '../utils/welcome-i18n';

function markdownToText(markdown: string): string {
  return (
    markdown
      // headings/quotes
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s{0,3}>\s?/gm, '')
      // images/links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // code fences/inline code
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // emphasis
      .replace(/[*_~]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function makeExcerpt(markdown: string, maxLen = 160): string {
  const text = markdownToText(markdown);
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trimEnd()}…`;
}

@Injectable()
export class DigestWelcomePagesService {
  constructor(private readonly prisma: PrismaService) {}

  private defaultWelcomeMarkdown(): string {
    return [
      '# Welcome to Anyhunt',
      '',
      'Any topic. AI hunts',
      '',
      'Start with **Explore topics** to find something you care about, then follow or create your own subscription.',
    ].join('\n');
  }

  async ensureDefaultPage() {
    const count = await this.prisma.digestWelcomePage.count();
    if (count > 0) return;
    try {
      await this.prisma.digestWelcomePage.create({
        data: {
          slug: 'welcome',
          enabled: true,
          sortOrder: 0,
          titleByLocale: { en: 'Welcome to Anyhunt' },
          contentMarkdownByLocale: { en: this.defaultWelcomeMarkdown() },
        },
      });
    } catch (e) {
      if (this.toUniqueConstraintError(e)) return;
      throw e;
    }
  }

  private toUniqueConstraintError(e: unknown): boolean {
    return (
      e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
    );
  }

  async listPublicPages(params: { locale?: string; acceptLanguage?: string }) {
    await this.ensureDefaultPage();

    const locale = params.locale
      ? normalizeLocale(params.locale)
      : parseAcceptLanguage(params.acceptLanguage);

    const pages = await this.prisma.digestWelcomePage.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    return pages.map((page) => {
      const title = pickLocaleValue(page.titleByLocale as LocaleRecord, locale);
      const markdown = pickLocaleValue(
        page.contentMarkdownByLocale as LocaleRecord,
        locale,
      );

      return {
        slug: page.slug,
        title,
        excerpt: makeExcerpt(markdown),
        updatedAt: page.updatedAt,
      };
    });
  }

  async getPublicPage(params: {
    slug: string;
    locale?: string;
    acceptLanguage?: string;
  }) {
    await this.ensureDefaultPage();

    const locale = params.locale
      ? normalizeLocale(params.locale)
      : parseAcceptLanguage(params.acceptLanguage);

    const page = await this.prisma.digestWelcomePage.findUnique({
      where: { slug: params.slug },
    });
    if (!page || !page.enabled) {
      throw new NotFoundException('Welcome page not found');
    }

    return {
      slug: page.slug,
      title: pickLocaleValue(page.titleByLocale as LocaleRecord, locale),
      contentMarkdown: pickLocaleValue(
        page.contentMarkdownByLocale as LocaleRecord,
        locale,
      ),
      updatedAt: page.updatedAt,
    };
  }

  async listAdminPages() {
    await this.ensureDefaultPage();

    const pages = await this.prisma.digestWelcomePage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    return pages.map((page) => ({
      id: page.id,
      slug: page.slug,
      enabled: page.enabled,
      sortOrder: page.sortOrder,
      titleByLocale: page.titleByLocale as LocaleRecord,
      contentMarkdownByLocale: page.contentMarkdownByLocale as LocaleRecord,
      updatedAt: page.updatedAt,
    }));
  }

  async createAdminPage(input: CreateWelcomePageInput) {
    try {
      const nextSortOrder =
        input.sortOrder ??
        ((
          await this.prisma.digestWelcomePage.aggregate({
            _max: { sortOrder: true },
          })
        )?._max?.sortOrder ?? -1) + 1;

      const created = await this.prisma.digestWelcomePage.create({
        data: {
          slug: input.slug,
          enabled: input.enabled,
          sortOrder: nextSortOrder,
          titleByLocale: input.titleByLocale,
          contentMarkdownByLocale: input.contentMarkdownByLocale,
        },
      });

      const total = await this.prisma.digestWelcomePage.count();
      if (total === 1) {
        await this.prisma.digestWelcomeConfig.upsert({
          where: { id: 'welcome' },
          create: {
            id: 'welcome',
            enabled: true,
            defaultSlug: created.slug,
          },
          update: { defaultSlug: created.slug },
        });
      }

      return created.id;
    } catch (e) {
      if (this.toUniqueConstraintError(e)) {
        throw new BadRequestException('Slug already exists');
      }
      throw e;
    }
  }

  async updateAdminPage(id: string, input: UpdateWelcomePageInput) {
    const existing = await this.prisma.digestWelcomePage.findUnique({
      where: { id },
      select: { slug: true, enabled: true },
    });
    if (!existing) throw new NotFoundException('Welcome page not found');

    const config = await this.prisma.digestWelcomeConfig.findUnique({
      where: { id: 'welcome' },
    });

    if (existing.enabled && !input.enabled) {
      const enabledOthers = await this.prisma.digestWelcomePage.count({
        where: { enabled: true, id: { not: id } },
      });
      if (enabledOthers === 0) {
        throw new BadRequestException('Cannot disable the last welcome page');
      }
    }

    const shouldMoveDefaultSlug =
      Boolean(config) && config!.defaultSlug === existing.slug;

    const fallbackForDisable =
      shouldMoveDefaultSlug && !input.enabled
        ? await this.prisma.digestWelcomePage.findFirst({
            where: { enabled: true, id: { not: id } },
            orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
          })
        : null;

    if (shouldMoveDefaultSlug && !input.enabled && !fallbackForDisable) {
      throw new BadRequestException('Cannot disable the last welcome page');
    }

    try {
      await this.prisma.digestWelcomePage.update({
        where: { id },
        data: {
          slug: input.slug,
          enabled: input.enabled,
          sortOrder: input.sortOrder,
          titleByLocale: input.titleByLocale,
          contentMarkdownByLocale: input.contentMarkdownByLocale,
        },
      });
    } catch (e) {
      if (this.toUniqueConstraintError(e)) {
        throw new BadRequestException('Slug already exists');
      }
      throw e;
    }

    if (!config) return;

    if (config.defaultSlug === existing.slug && existing.slug !== input.slug) {
      if (!input.enabled) {
        await this.prisma.digestWelcomeConfig.update({
          where: { id: 'welcome' },
          data: { defaultSlug: fallbackForDisable!.slug },
        });
        return;
      }

      await this.prisma.digestWelcomeConfig.update({
        where: { id: 'welcome' },
        data: { defaultSlug: input.slug },
      });
      return;
    }

    if (config.defaultSlug !== input.slug) return;

    if (input.enabled) return;

    await this.prisma.digestWelcomeConfig.update({
      where: { id: 'welcome' },
      data: { defaultSlug: fallbackForDisable!.slug },
    });
  }

  async deleteAdminPage(id: string) {
    const page = await this.prisma.digestWelcomePage.findUnique({
      where: { id },
    });
    if (!page) return;

    await this.prisma.digestWelcomePage.delete({ where: { id } });

    const config = await this.prisma.digestWelcomeConfig.findUnique({
      where: { id: 'welcome' },
    });
    if (!config) return;

    if (config.defaultSlug !== page.slug) return;

    const next = await this.prisma.digestWelcomePage.findFirst({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    if (!next) {
      throw new BadRequestException('Cannot delete the last welcome page');
    }

    await this.prisma.digestWelcomeConfig.update({
      where: { id: 'welcome' },
      data: { defaultSlug: next.slug },
    });
  }

  async reorderAdminPages(ids: string[]) {
    if (ids.length === 0) return;

    const existing = await this.prisma.digestWelcomePage.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (existing.length !== ids.length) {
      throw new NotFoundException('Some welcome pages were not found');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of ids.entries()) {
        await tx.digestWelcomePage.update({
          where: { id },
          data: { sortOrder: index },
        });
      }
    });
  }

  async assertSlugExists(slug: string) {
    const page = await this.prisma.digestWelcomePage.findUnique({
      where: { slug },
      select: { slug: true, enabled: true },
    });
    if (!page || !page.enabled) {
      throw new NotFoundException('Welcome page not found');
    }
  }
}
