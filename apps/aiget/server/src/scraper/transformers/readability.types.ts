// apps/server/src/scraper/transformers/readability.types.ts
/**
 * [DEFINES]: Types for content extraction
 * [USED_BY]: readability.transformer.ts, scraper.processor.ts
 * [POS]: Type definitions for ExtractOptions
 */

/**
 * Options for content extraction
 */
export interface ExtractOptions {
  /** Only keep content from these selectors (applied first) */
  includeTags?: string[];
  /** Remove elements matching these selectors (applied before noise removal) */
  excludeTags?: string[];
  /** Base URL for converting relative URLs to absolute */
  baseUrl?: string;
}
