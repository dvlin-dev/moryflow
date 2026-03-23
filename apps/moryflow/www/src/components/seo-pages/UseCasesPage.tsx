'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight, Bot, BookOpenText, Download, Globe, NotebookPen } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { DownloadCtaSection } from '@/components/shared/DownloadCtaSection';
import { JsonLd, createBreadcrumbSchema, createWebPageSchema } from '@/components/seo/JsonLd';
import { useCasesPageContent } from '@/lib/use-cases-content';
import { getPageHref } from '@/lib/site-pages';
import { getCanonicalUrl, siteConfig } from '@/lib/seo';
import { localePath, t } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';

const FEATURED_ICONS = [NotebookPen, Bot, Globe, BookOpenText] as const;

export function UseCasesPage() {
  const locale = useLocale();
  const content = useCasesPageContent[locale];
  const downloadHref = getPageHref('/download', locale);

  return (
    <>
      <JsonLd
        data={createWebPageSchema({
          name: content.title,
          description: content.description,
          url: getCanonicalUrl('/use-cases', locale),
        })}
      />
      <JsonLd
        data={createBreadcrumbSchema([
          { name: 'Home', url: `${siteConfig.url}${localePath('/', locale)}` },
          { name: content.title, url: `${siteConfig.url}${localePath('/use-cases', locale)}` },
        ])}
      />
      <main className="pt-24 pb-20">
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--gradient-hero-glow)' }}
          />
          <div className="container relative mx-auto max-w-4xl text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-brand">
              {content.eyebrow}
            </p>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {content.headline}
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {content.subheadline}
            </p>
            <div className="mt-10 flex flex-col items-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-xl bg-foreground px-8 py-3 text-base font-medium text-background transition-all hover:bg-foreground/90 hover:shadow-lg"
                data-track-cta="use-cases-hero-download"
              >
                <Link to={downloadHref}>
                  <Download size={18} />
                  {t('cta.downloadMoryflow', locale)}
                </Link>
              </Button>
              <p className="text-sm text-tertiary">{t('cta.freeToStartFull', locale)}</p>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-10 max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {content.featuredTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {content.featuredDescription}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {content.featuredLinks.map((link, index) => {
                const Icon = FEATURED_ICONS[index % FEATURED_ICONS.length]!;

                return (
                  <Link
                    key={link.href}
                    to={getPageHref(link.href, locale)}
                    className="group rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{link.label}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {link.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors group-hover:text-brand-dark">
                      {link.label}
                      <ArrowRight size={14} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="px-4 py-16 sm:px-6"
          style={{ background: 'var(--gradient-section-subtle)' }}
        >
          <div className="container mx-auto max-w-6xl space-y-8">
            {content.sections.map((section) => (
              <div
                key={section.title}
                className="rounded-3xl border border-border/70 bg-card/90 p-8 shadow-xs"
              >
                <div className="max-w-3xl">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {section.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {section.description}
                  </p>
                </div>
                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      to={getPageHref(link.href, locale)}
                      className="group rounded-2xl border border-border bg-background/80 p-5 transition-all hover:border-brand/30 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{link.label}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {link.description}
                          </p>
                        </div>
                        <ArrowRight
                          size={16}
                          className="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <DownloadCtaSection
          title={content.ctaTitle}
          description={content.ctaDescription}
          trackId="use-cases-download"
        />
      </main>
    </>
  );
}
