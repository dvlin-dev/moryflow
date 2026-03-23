import { createFileRoute } from '@tanstack/react-router';
import { UseCasesPage } from '@/components/seo-pages/UseCasesPage';
import { resolveLocale } from '@/lib/i18n';
import { getPageMeta } from '@/lib/seo';
import { useCasesPageContent } from '@/lib/use-cases-content';

export const Route = createFileRoute('/{-$locale}/use-cases')({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale);
    const content = useCasesPageContent[locale];

    return getPageMeta({
      pageId: 'use-cases',
      locale: params.locale,
      title: content.title,
      description: content.description,
    });
  },
  component: UseCasesPage,
});
