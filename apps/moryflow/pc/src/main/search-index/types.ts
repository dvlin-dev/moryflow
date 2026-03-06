/**
 * [DEFINES]: 全局搜索主进程常量与内部类型
 * [USED_BY]: search-index/*
 * [POS]: PC main/search-index 类型与边界常量
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { SearchQueryInput, SearchStatus } from '../../shared/ipc/search.js';

export const DEFAULT_LIMIT_PER_GROUP = 10;
export const MAX_LIMIT_PER_GROUP = 10;
export const MIN_QUERY_LENGTH = 2;
export const QUERY_SOURCE_BUDGET = 20;
export const QUERY_SOURCE_CONCURRENCY = 4;
export const SNIPPET_CACHE_CAPACITY = 500;
export const SEARCH_CANDIDATE_MULTIPLIER = 4;
export const FUZZY_DOC_MAX_TOKENS = 20_000;
export const FUZZY_QUERY_MAX_TOKENS = 64;

export type SearchDocumentKind = 'file' | 'thread';
export type SearchQueryMode = 'exact' | 'fuzzy';

export type SearchQueryRuntimeInput = SearchQueryInput & {
  vaultPath: string;
};

export type SearchDocumentInput = {
  docId: string;
  kind: SearchDocumentKind;
  vaultPath: string;
  entityKey: string;
  title: string;
  body: string;
  updatedAt: number;
  digest: string;
  filePath?: string;
  relativePath?: string;
  fileName?: string;
  sessionId?: string;
};

export type SearchDocumentMeta = {
  id: number;
  docId: string;
  kind: SearchDocumentKind;
  vaultPath: string;
  entityKey: string;
  title: string;
  updatedAt: number;
  digest: string;
  filePath: string | null;
  relativePath: string | null;
  fileName: string | null;
  sessionId: string | null;
};

export type SearchIndexSnapshot = {
  status: SearchStatus;
};

export const createDefaultSearchStatus = (): SearchStatus => ({
  state: 'idle',
  filesIndexed: 0,
  threadsIndexed: 0,
  lastBuiltAt: null,
});
