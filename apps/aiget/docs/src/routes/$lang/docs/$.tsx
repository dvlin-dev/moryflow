import { createFileRoute, notFound, useParams } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { MDXContent } from '@content-collections/mdx/react';
import { source } from '../../../lib/source';
import { baseOptions } from '../../../lib/layout.shared';
import { getMDXComponents } from '../../../mdx-components';

export const Route = createFileRoute('/$lang/docs/$')({
  component: DocsPageComponent,
  head: ({ params }: { params: { lang: string; _splat?: string } }) => {
    const slug = params._splat?.split('/') ?? [];
    const page = source.getPage(slug, params.lang);

    if (!page) {
      return {
        meta: [{ title: 'Not Found | AIGet Docs' }],
      };
    }

    return {
      meta: [
        { title: `${page.data.title} | AIGet Docs` },
        { name: 'description', content: page.data.description },
      ],
    };
  },
});

function DocsPageComponent() {
  const params = useParams({ from: '/$lang/docs/$' }) as { lang: string; _splat?: string };
  const slug = params._splat?.split('/') ?? [];
  const page = source.getPage(slug, params.lang);

  if (!page) {
    throw notFound();
  }

  return (
    <DocsLayout
      tree={source.getPageTree(params.lang)}
      {...baseOptions(params.lang)}
      sidebar={{
        banner: (
          <div className="border-b border-border pb-4 mb-4">
            <p className="text-sm text-muted-foreground">
              {params.lang === 'zh' ? '网页截图 API' : 'Web Screenshot API'}
            </p>
          </div>
        ),
      }}
    >
      {}
      <DocsPage toc={(page.data as any).toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        {page.data.description && <DocsDescription>{page.data.description}</DocsDescription>}
        <DocsBody>
          {}
          <MDXContent code={(page.data as any).body} components={getMDXComponents()} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
