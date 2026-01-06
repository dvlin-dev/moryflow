import { createServerFn } from '@tanstack/react-start'
import { initAdvancedSearch, type AdvancedIndex } from 'fumadocs-core/search/server'
import { createTokenizer } from '@orama/tokenizers/mandarin'
import type { StructuredData } from 'fumadocs-core/mdx-plugins'
import { source } from './source'

const indexes: AdvancedIndex[] = source.getPages().map((page) => ({
  id: page.url,
  url: page.url,
  title: page.data.title ?? 'Untitled',
  description: page.data.description,
  structuredData: (page.data as { structuredData?: StructuredData }).structuredData ?? {
    headings: [],
    contents: [],
  },
}))

const enSearch = initAdvancedSearch({
  language: 'english',
  indexes: indexes.filter((p) => !p.url.startsWith('/zh/')),
})

const zhSearch = initAdvancedSearch({
  components: { tokenizer: createTokenizer() },
  search: { threshold: 0, tolerance: 0 },
  indexes: indexes.filter((p) => p.url.startsWith('/zh/')),
})

export const searchDocs = createServerFn({ method: 'GET' })
  .inputValidator((data: { query: string; locale?: string }) => data)
  .handler(async ({ data }) => {
    const { query, locale = 'en' } = data
    const search = locale === 'zh' ? zhSearch : enSearch
    return search.search(query, { locale })
  })
