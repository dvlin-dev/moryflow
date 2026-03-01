/**
 * [INPUT]: 搜索词 + 当前 vault + 分组上限
 * [OUTPUT]: Files/Threads 搜索结果
 * [POS]: PC 全局搜索查询层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { readFile } from 'node:fs/promises';
import { readSessions } from '../chat-session-store/store.js';
import { querySearchDocuments } from './store.js';
import { extractSessionBodyForSearch } from './thread-indexer.js';
import {
  QUERY_SOURCE_BUDGET,
  QUERY_SOURCE_CONCURRENCY,
  SEARCH_CANDIDATE_MULTIPLIER,
  SNIPPET_CACHE_CAPACITY,
  type SearchQueryRuntimeInput,
  type SearchQueryMode,
} from './types.js';

type SnippetCacheEntry = {
  text: string;
};

type QueryRow = ReturnType<typeof querySearchDocuments>[number];
type RankedRow = QueryRow & {
  weightedScore: number;
  modePriority: number;
};

const snippetCache = new Map<string, SnippetCacheEntry>();
const MATCH_MODE_WEIGHT: Record<SearchQueryMode, number> = {
  exact: 1,
  fuzzy: 0.65,
};
const MATCH_MODE_PRIORITY: Record<SearchQueryMode, number> = {
  exact: 0,
  fuzzy: 1,
};

const toScore = (rank: number) => {
  if (!Number.isFinite(rank)) {
    return 0;
  }
  return rank >= 0 ? 1 / (1 + rank) : Math.abs(rank);
};

const toRankedRow = (row: QueryRow, mode: SearchQueryMode): RankedRow => ({
  ...row,
  weightedScore: toScore(row.rank) * MATCH_MODE_WEIGHT[mode],
  modePriority: MATCH_MODE_PRIORITY[mode],
});

const compareRankedRow = (left: RankedRow, right: RankedRow) => {
  if (left.modePriority !== right.modePriority) {
    return left.modePriority - right.modePriority;
  }
  if (left.weightedScore !== right.weightedScore) {
    return right.weightedScore - left.weightedScore;
  }
  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt - left.updatedAt;
  }
  return left.docId.localeCompare(right.docId);
};

const mergeRowsByMode = (
  exactRows: QueryRow[],
  fuzzyRows: QueryRow[],
  limit: number
): RankedRow[] => {
  const merged = new Map<string, RankedRow>();
  const rankedRows = [
    ...exactRows.map((row) => toRankedRow(row, 'exact')),
    ...fuzzyRows.map((row) => toRankedRow(row, 'fuzzy')),
  ];

  for (const candidate of rankedRows) {
    const existing = merged.get(candidate.docId);
    if (!existing || compareRankedRow(candidate, existing) < 0) {
      merged.set(candidate.docId, candidate);
    }
  }

  return Array.from(merged.values()).sort(compareRankedRow).slice(0, limit);
};

const buildCacheKey = (docId: string, digest: string) => `${docId}:${digest}`;

const getCachedSnippetSource = (cacheKey: string) => {
  const cached = snippetCache.get(cacheKey);
  if (!cached) {
    return null;
  }
  snippetCache.delete(cacheKey);
  snippetCache.set(cacheKey, cached);
  return cached;
};

const setCachedSnippetSource = (cacheKey: string, entry: SnippetCacheEntry) => {
  if (snippetCache.has(cacheKey)) {
    snippetCache.delete(cacheKey);
  }
  snippetCache.set(cacheKey, entry);

  while (snippetCache.size > SNIPPET_CACHE_CAPACITY) {
    const oldestKey = snippetCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    snippetCache.delete(oldestKey);
  }
};

const compactWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim();

const tokenizeQuery = (query: string) =>
  query
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);

const buildSnippetFromSource = (source: string, query: string) => {
  const normalized = compactWhitespace(source);
  if (!normalized) {
    return '';
  }

  const queryTokens = tokenizeQuery(query);
  const lowerSource = normalized.toLowerCase();

  let matchIndex = -1;
  for (const token of queryTokens) {
    const index = lowerSource.indexOf(token);
    if (index === -1) {
      continue;
    }
    if (matchIndex === -1 || index < matchIndex) {
      matchIndex = index;
    }
  }

  if (matchIndex < 0) {
    matchIndex = 0;
  }

  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(normalized.length, matchIndex + 120);
  const excerpt = normalized.slice(start, end).trim();
  const prefix = start > 0 ? '…' : '';
  const suffix = end < normalized.length ? '…' : '';

  return `${prefix}${excerpt}${suffix}`;
};

const runWithConcurrency = async (tasks: Array<() => Promise<void>>, limit: number) => {
  if (tasks.length === 0) {
    return;
  }

  let cursor = 0;
  const workerCount = Math.max(1, Math.min(limit, tasks.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < tasks.length) {
        const current = cursor;
        cursor += 1;
        const task = tasks[current];
        if (!task) {
          continue;
        }
        await task();
      }
    })
  );
};

const resolveFileSourceText = async (filePath: string | null) => {
  if (!filePath) {
    return '';
  }
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
};

const resolveThreadSourceText = (
  sessionId: string | null,
  getSessions: () => ReturnType<typeof readSessions>
) => {
  if (!sessionId) {
    return '';
  }
  const session = getSessions()[sessionId];
  if (!session) {
    return '';
  }
  return extractSessionBodyForSearch(session);
};

export const runSearchQuery = async (input: SearchQueryRuntimeInput) => {
  const limit = input.limitPerGroup ?? 10;
  const candidateLimit = Math.max(limit, limit * SEARCH_CANDIDATE_MULTIPLIER);

  const fileRows = mergeRowsByMode(
    querySearchDocuments({
      kind: 'file',
      mode: 'exact',
      vaultPath: input.vaultPath,
      query: input.query,
      limit: candidateLimit,
    }),
    querySearchDocuments({
      kind: 'file',
      mode: 'fuzzy',
      vaultPath: input.vaultPath,
      query: input.query,
      limit: candidateLimit,
    }),
    limit
  );

  const threadRows = mergeRowsByMode(
    querySearchDocuments({
      kind: 'thread',
      mode: 'exact',
      vaultPath: input.vaultPath,
      query: input.query,
      limit: candidateLimit,
    }),
    querySearchDocuments({
      kind: 'thread',
      mode: 'fuzzy',
      vaultPath: input.vaultPath,
      query: input.query,
      limit: candidateLimit,
    }),
    limit
  );

  const allRows = [...fileRows, ...threadRows];
  const snippetSourceByDocId = new Map<string, string>();
  const sourceTasks: Array<() => Promise<void>> = [];

  let sessionsSnapshot: ReturnType<typeof readSessions> | null = null;
  const getSessions = () => {
    if (sessionsSnapshot) {
      return sessionsSnapshot;
    }
    sessionsSnapshot = readSessions();
    return sessionsSnapshot;
  };

  for (const row of allRows) {
    const cacheKey = buildCacheKey(row.docId, row.digest);
    const cached = getCachedSnippetSource(cacheKey);
    if (cached) {
      snippetSourceByDocId.set(row.docId, cached.text);
      continue;
    }

    if (sourceTasks.length >= QUERY_SOURCE_BUDGET) {
      continue;
    }

    sourceTasks.push(async () => {
      const sourceText =
        row.kind === 'file'
          ? await resolveFileSourceText(row.filePath)
          : resolveThreadSourceText(row.sessionId, getSessions);

      const compacted = compactWhitespace(sourceText);
      if (!compacted) {
        return;
      }

      snippetSourceByDocId.set(row.docId, compacted);
      setCachedSnippetSource(cacheKey, { text: compacted });
    });
  }

  await runWithConcurrency(sourceTasks, QUERY_SOURCE_CONCURRENCY);

  return {
    files: fileRows.map((row) => ({
      type: 'file' as const,
      docId: row.docId,
      vaultPath: row.vaultPath,
      filePath: row.filePath ?? '',
      relativePath: row.relativePath ?? '',
      fileName: row.fileName ?? row.title,
      score: row.weightedScore,
      snippet: buildSnippetFromSource(snippetSourceByDocId.get(row.docId) ?? '', input.query),
      updatedAt: row.updatedAt,
    })),
    threads: threadRows.map((row) => ({
      type: 'thread' as const,
      docId: row.docId,
      vaultPath: row.vaultPath,
      sessionId: row.sessionId ?? '',
      title: row.title,
      score: row.weightedScore,
      snippet: buildSnippetFromSource(snippetSourceByDocId.get(row.docId) ?? '', input.query),
      updatedAt: row.updatedAt,
    })),
    tookMs: 0,
  };
};
