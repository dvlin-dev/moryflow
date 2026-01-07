/**
 * Extract module type definitions
 *
 * [DEFINES]: ExtractResult, ExtractResponse
 * [USED_BY]: extract.service.ts, extract.controller.ts
 * [POS]: Response types and internal data structures (not used for validation)
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and the directory CLAUDE.md
 */

/**
 * Single URL extraction result
 */
export interface ExtractResult {
  url: string;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Extract API response
 */
export interface ExtractResponse {
  results: ExtractResult[];
}
