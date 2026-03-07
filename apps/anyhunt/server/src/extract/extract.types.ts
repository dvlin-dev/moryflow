/**
 * Extract module type definitions
 *
 * [DEFINES]: ExtractResult, ExtractResponse
 * [USED_BY]: extract.service.ts, extract.controller.ts
 * [POS]: Response types and internal data structures (not used for validation)
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
