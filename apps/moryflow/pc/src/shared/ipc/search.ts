/**
 * [DEFINES]: 全局搜索 IPC 类型（Files + Threads）
 * [USED_BY]: main/search-index, preload, renderer global-search
 * [POS]: PC IPC search 类型入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type SearchGroupLimit = number;

export type SearchQueryInput = {
  query: string;
  limitPerGroup?: SearchGroupLimit;
};

export type SearchFileHit = {
  type: 'file';
  docId: string;
  vaultPath: string;
  filePath: string;
  relativePath: string;
  fileName: string;
  score: number;
  snippet: string;
  updatedAt: number;
};

export type SearchThreadHit = {
  type: 'thread';
  docId: string;
  vaultPath: string;
  sessionId: string;
  title: string;
  score: number;
  snippet: string;
  updatedAt: number;
};

export type SearchQueryResult = {
  files: SearchFileHit[];
  threads: SearchThreadHit[];
  tookMs: number;
};

export type SearchStatus = {
  state: 'idle' | 'building' | 'ready' | 'error';
  filesIndexed: number;
  threadsIndexed: number;
  lastBuiltAt: number | null;
  lastError?: string;
};

export type SearchRebuildResult = {
  ok: true;
  status: SearchStatus;
};
