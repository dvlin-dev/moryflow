import { createServerFn } from '@tanstack/react-start';
import { initAdvancedSearch } from 'fumadocs-core/search/server';
import { createTokenizer } from '@orama/tokenizers/mandarin';
import { source } from './source';

// Get all pages and create search indexes
function getSearchIndexes() {
  const pages = source.getPages();
  return pages.map((page) => ({
    id: page.url,
    url: page.url,
    title: page.data.title ?? page.url,
    description: page.data.description ?? '',

    structuredData: (page.data as any).structuredData,
  }));
}

// Initialize search for English
const enSearch = initAdvancedSearch({
  language: 'english',
  indexes: getSearchIndexes().filter((p) => !p.url.startsWith('/zh/')),
});

// Initialize search for Chinese
const zhSearch = initAdvancedSearch({
  components: { tokenizer: createTokenizer() },
  search: { threshold: 0, tolerance: 0 },
  indexes: getSearchIndexes().filter((p) => p.url.startsWith('/zh/')),
});

// Server function to search docs
export const searchDocs = createServerFn({ method: 'GET' })
  .inputValidator((data: { query: string; locale?: string }) => data)
  .handler(async ({ data }) => {
    const { query, locale = 'en' } = data;

    const search = locale === 'zh' ? zhSearch : enSearch;
    const results = await search.search(query, {
      locale,
    });

    return results;
  });

// Export static search index for client-side search
export const getStaticSearchIndex = createServerFn({ method: 'GET' })
  .inputValidator((data: { locale?: string }) => data)
  .handler(async ({ data }) => {
    const { locale = 'en' } = data;
    const indexes = getSearchIndexes().filter((p) =>
      locale === 'zh' ? p.url.startsWith('/zh/') : !p.url.startsWith('/zh/')
    );
    return { indexes };
  });
