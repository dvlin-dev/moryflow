import { createFileRoute, notFound } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale } from '@/lib/i18n';
import { getArticleBySlug } from '@/lib/geo-articles';
import { GeoArticlePage } from '@/components/seo-pages/GeoArticlePage';
import { useLocale } from '@/routes/{-$locale}/route';

export const Route = createFileRoute('/{-$locale}/blog/$slug')({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale);
    const article = getArticleBySlug(params.slug);
    if (!article) return {};
    const fm = article.content[locale]?.frontmatter;
    if (!fm) return {};
    return getPageMeta({
      pageId: `blog-${params.slug}`,
      locale: params.locale,
      title: fm.title,
      description: fm.description,
      path: `/blog/${params.slug}`,
      type: 'article',
      publishedTime: fm.publishedAt,
    });
  },
  component: BlogArticlePage,
});

function BlogArticlePage() {
  const locale = useLocale();
  const { slug } = Route.useParams();
  const article = getArticleBySlug(slug);
  if (!article) throw notFound();
  const localeData = article.content[locale];
  if (!localeData) throw notFound();
  return <GeoArticlePage frontmatter={localeData.frontmatter} MdBody={localeData.Component} />;
}
