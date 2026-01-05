/**
 * Search module type definitions
 *
 * [DEFINES]: SearchResult, SearXNGResponse, SearXNGResult, SearchResponse
 * [USED_BY]: search.service.ts
 * [POS]: Response types and internal data structures (not used for validation)
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and the directory CLAUDE.md
 */

/**
 * Single search result
 */
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  engine: string;
  score?: number;
  publishedDate?: string;
  thumbnail?: string;
  content?: string; // If scrapeResults=true
}

/**
 * SearXNG API response type
 */
export interface SearXNGResponse {
  query: string;
  number_of_results: number;
  results: SearXNGResult[];
  suggestions?: string[];
  infoboxes?: unknown[];
}

export interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  score?: number;
  category?: string;
  pretty_url?: string;
  publishedDate?: string;
  thumbnail?: string;
  img_src?: string;
}

/**
 * Search API response
 */
export interface SearchResponse {
  query: string;
  numberOfResults: number;
  results: SearchResult[];
  suggestions?: string[];
}
