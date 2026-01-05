import { createFileRoute, notFound } from '@tanstack/react-router'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page'
import { MDXContent } from '@content-collections/mdx/react'
import { source } from '../../lib/source'
import { baseOptions } from '../../lib/layout.shared'
import { getMDXComponents } from '../../mdx-components'

export const Route = createFileRoute('/docs/$')({
  component: DocsPageComponent,
  head: ({ params }: { params: { _splat?: string } }) => {
    const slug = params._splat?.split('/') ?? []
    const page = source.getPage(slug, 'en')

    if (!page) {
      return {
        meta: [{ title: 'Not Found | Memai Docs' }],
      }
    }

    return {
      meta: [
        { title: `${page.data.title} | Memai Docs` },
        { name: 'description', content: page.data.description },
      ],
    }
  },
})

function DocsPageComponent() {
  const params = Route.useParams() as { _splat?: string }
  const slug = params._splat?.split('/') ?? []
  const page = source.getPage(slug, 'en')

  if (!page) {
    throw notFound()
  }

  return (
    <DocsLayout
      tree={source.getPageTree('en')}
      {...baseOptions()}
      sidebar={{
        banner: (
          <div className="border-b border-border pb-4 mb-4">
            <p className="text-sm text-muted-foreground">AI Memory API</p>
          </div>
        ),
      }}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DocsPage toc={(page.data as any).toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        {page.data.description && <DocsDescription>{page.data.description}</DocsDescription>}
        <DocsBody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <MDXContent code={(page.data as any).body} components={getMDXComponents()} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  )
}
