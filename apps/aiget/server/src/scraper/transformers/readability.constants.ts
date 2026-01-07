// apps/server/src/scraper/transformers/readability.constants.ts
/**
 * [PROVIDES]: Constants for content extraction
 * [USED_BY]: readability.transformer.ts
 * [POS]: Configuration constants for Firecrawl-style content extraction
 */

/** Minimum content length threshold for valid extraction */
export const MIN_CONTENT_LENGTH = 50;

/** Character threshold for Readability algorithm (lowered to support small pages) */
export const READABILITY_CHAR_THRESHOLD = 100;

/** Noise elements to remove (Firecrawl-inspired) */
export const NOISE_SELECTORS = [
  // Structural noise
  'header',
  'footer',
  'nav',
  'aside',
  // Class/ID noise
  '.header',
  '.top',
  '.navbar',
  '#header',
  '.footer',
  '.bottom',
  '#footer',
  '.sidebar',
  '.side',
  '.aside',
  '#sidebar',
  '.modal',
  '.popup',
  '#modal',
  '.overlay',
  '.ad',
  '.ads',
  '.advert',
  '.advertisement',
  '#ad',
  '.lang-selector',
  '.language',
  '#language-selector',
  '.social',
  '.social-media',
  '.social-links',
  '#social',
  '.menu',
  '.navigation',
  '#nav',
  '.breadcrumbs',
  '#breadcrumbs',
  '.share',
  '#share',
  '.widget',
  '#widget',
  '.cookie',
  '#cookie',
  '.cookie-notice',
  '.cookie-banner',
] as const;

/** Elements that should be preserved even if they match noise patterns */
export const FORCE_INCLUDE_SELECTORS = [
  '#main',
  'main',
  'article',
  '[role="main"]',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.prose',
] as const;

/** Fallback selectors for content extraction */
export const FALLBACK_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.post-content',
  '.article-content',
  '.entry-content',
  '#content',
  '.content',
  '.prose',
] as const;

/** Site-specific extraction rules */
export const SITE_RULES: ReadonlyArray<{
  domain: string;
  contentSelector: string;
}> = [
  { domain: 'medium.com', contentSelector: 'article' },
  { domain: 'github.com', contentSelector: '.markdown-body' },
  { domain: 'stackoverflow.com', contentSelector: '.question, .answer' },
  { domain: 'twitter.com', contentSelector: '[data-testid="tweetText"]' },
  { domain: 'x.com', contentSelector: '[data-testid="tweetText"]' },
];
