import { createFileRoute, notFound, useParams } from '@tanstack/react-router'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page'
import { MDXContent } from '@content-collections/mdx/react'
import { source } from '../../../lib/source'
import { baseOptions } from '../../../lib/layout.shared'
import { getMDXComponents } from '../../../mdx-components'

// @ts-expect-error - Route path is generated at build time
export const Route = createFileRoute('/$lang/docs/$')({
  component: DocsPageComponent,
  head: ({ params }: { params: { lang: string; _splat?: string } }) => {
    const slug = params._splat?.split('/') ?? []
    const page = source.getPage(slug, params.lang)

    if (!page) {
      return {
        meta: [{ title: 'Not Found | MoryFlow Docs' }],
      }
    }

    return {
      meta: [
        { title: `${page.data.title} | MoryFlow Docs` },
        { name: 'description', content: page.data.description },
      ],
    }
  },
})

function DocsPageComponent() {
  const params = useParams({ from: '/$lang/docs/$' }) as { lang: string; _splat?: string }
  const slug = params._splat?.split('/') ?? []
  const page = source.getPage(slug, params.lang)

  if (!page) {
    throw notFound()
  }

  return (
    <DocsLayout
      tree={source.getPageTree(params.lang)}
      {...baseOptions(params.lang)}
      sidebar={{
        banner: (
          <div className="border-b border-border pb-4 mb-4">
            <p className="text-sm text-muted-foreground">
              {params.lang === 'zh' ? '会思考的 AI 笔记伙伴' : 'AI Note-Taking Companion'}
            </p>
          </div>
        ),
      }}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DocsPage toc={(page.data as any).toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        {page.data.description && (
          <DocsDescription>{page.data.description}</DocsDescription>
        )}
        <DocsBody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <MDXContent code={(page.data as any).body} components={getMDXComponents()} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  )
}
