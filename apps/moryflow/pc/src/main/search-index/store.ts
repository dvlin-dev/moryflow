/**
 * [INPUT]: 索引文档写入/删除、查询参数、状态变更
 * [OUTPUT]: 全局搜索 SQLite FTS 存储与状态快照
 * [POS]: PC 全局搜索单一事实源（contentless FTS + 跨语言 fuzzy）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { app } from 'electron';
import type { SearchStatus } from '../../shared/ipc/search.js';
import { buildExactMatchQuery, buildFuzzyMatchQuery, buildFuzzyTokenStream } from './tokenizer.js';
import {
  createDefaultSearchStatus,
  FUZZY_DOC_MAX_TOKENS,
  FUZZY_QUERY_MAX_TOKENS,
  type SearchDocumentInput,
  type SearchDocumentKind,
  type SearchDocumentMeta,
  type SearchIndexSnapshot,
  type SearchQueryMode,
} from './types.js';

type DatabaseInstance = ReturnType<typeof Database>;

type QueryDocumentRow = SearchDocumentMeta & {
  rank: number;
};

const SEARCH_PRAGMAS = ['journal_mode = WAL', 'synchronous = NORMAL', 'foreign_keys = ON'];
const SEARCH_SCHEMA_VERSION = 2;
const SEARCH_TABLE_BY_MODE: Record<SearchQueryMode, 'search_fts_exact' | 'search_fts_fuzzy'> = {
  exact: 'search_fts_exact',
  fuzzy: 'search_fts_fuzzy',
};
const SEARCH_TABLES_TO_DROP = `
DROP TABLE IF EXISTS search_fts;
DROP TABLE IF EXISTS search_fts_exact;
DROP TABLE IF EXISTS search_fts_fuzzy;
DROP TABLE IF EXISTS search_docs;
`;

const SEARCH_SCHEMA = `
CREATE TABLE IF NOT EXISTS search_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  vault_path TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  title TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  digest TEXT NOT NULL,
  file_path TEXT,
  relative_path TEXT,
  file_name TEXT,
  session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_search_docs_kind_vault_updated
  ON search_docs(kind, vault_path, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_docs_kind_vault_entity
  ON search_docs(kind, vault_path, entity_key);

CREATE VIRTUAL TABLE IF NOT EXISTS search_fts_exact
USING fts5(
  title,
  body,
  content = '',
  contentless_delete = 1,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE VIRTUAL TABLE IF NOT EXISTS search_fts_fuzzy
USING fts5(
  tokens,
  content = '',
  contentless_delete = 1,
  tokenize = 'unicode61 remove_diacritics 2'
);
`;

let db: DatabaseInstance | null = null;
let snapshot: SearchIndexSnapshot = {
  status: createDefaultSearchStatus(),
};

const mapDocumentRow = (row: Record<string, unknown>): SearchDocumentMeta => {
  const kind = row['kind'];
  if (kind !== 'file' && kind !== 'thread') {
    throw new Error(`invalid search document kind: ${String(kind)}`);
  }
  return {
    id: Number(row['id']),
    docId: String(row['doc_id'] ?? ''),
    kind,
    vaultPath: String(row['vault_path'] ?? ''),
    entityKey: String(row['entity_key'] ?? ''),
    title: String(row['title'] ?? ''),
    updatedAt: Number(row['updated_at'] ?? 0),
    digest: String(row['digest'] ?? ''),
    filePath: typeof row['file_path'] === 'string' ? row['file_path'] : null,
    relativePath: typeof row['relative_path'] === 'string' ? row['relative_path'] : null,
    fileName: typeof row['file_name'] === 'string' ? row['file_name'] : null,
    sessionId: typeof row['session_id'] === 'string' ? row['session_id'] : null,
  };
};

const initializeSchema = (database: DatabaseInstance) => {
  const currentVersion = Number(database.pragma('user_version', { simple: true }) ?? 0);
  if (currentVersion < SEARCH_SCHEMA_VERSION) {
    database.exec(SEARCH_TABLES_TO_DROP);
    database.exec(SEARCH_SCHEMA);
    database.pragma(`user_version = ${SEARCH_SCHEMA_VERSION}`);
    return;
  }

  database.exec(SEARCH_SCHEMA);
};

const ensureDatabase = () => {
  if (db) {
    return db;
  }

  const userDataPath = app.getPath('userData');
  const searchDirPath = path.join(userDataPath, 'search-index');
  const searchDbPath = path.join(searchDirPath, 'global-search.db');

  mkdirSync(searchDirPath, { recursive: true });

  db = new Database(searchDbPath);
  for (const pragma of SEARCH_PRAGMAS) {
    db.exec(`PRAGMA ${pragma};`);
  }
  initializeSchema(db);

  return db;
};

const buildMatchQueryByMode = (mode: SearchQueryMode, query: string) =>
  mode === 'exact'
    ? buildExactMatchQuery(query)
    : buildFuzzyMatchQuery(query, FUZZY_QUERY_MAX_TOKENS);

export const getSearchIndexStatus = (): SearchStatus => snapshot.status;

export const markSearchIndexBuilding = () => {
  snapshot = {
    status: {
      ...snapshot.status,
      state: 'building',
      lastError: undefined,
    },
  };
};

export const markSearchIndexReady = (counts: { filesIndexed: number; threadsIndexed: number }) => {
  snapshot = {
    status: {
      state: 'ready',
      filesIndexed: counts.filesIndexed,
      threadsIndexed: counts.threadsIndexed,
      lastBuiltAt: Date.now(),
    },
  };
};

export const markSearchIndexError = (error: unknown) => {
  snapshot = {
    status: {
      ...snapshot.status,
      state: 'error',
      lastError: error instanceof Error ? error.message : String(error),
    },
  };
};

export const listSearchDocumentsByKind = (
  kind: SearchDocumentKind,
  vaultPath: string
): SearchDocumentMeta[] => {
  const database = ensureDatabase();
  const rows = database
    .prepare(
      `SELECT id, doc_id, kind, vault_path, entity_key, title, updated_at, digest,
              file_path, relative_path, file_name, session_id
       FROM search_docs
       WHERE kind = ? AND vault_path = ?`
    )
    .all(kind, vaultPath) as Record<string, unknown>[];
  return rows.map(mapDocumentRow);
};

export const countSearchDocumentsByKind = (kind: SearchDocumentKind, vaultPath: string): number => {
  const database = ensureDatabase();
  const row = database
    .prepare('SELECT COUNT(1) AS count FROM search_docs WHERE kind = ? AND vault_path = ?')
    .get(kind, vaultPath) as { count?: number } | undefined;
  return row?.count ?? 0;
};

export const upsertSearchDocument = (input: SearchDocumentInput): void => {
  const database = ensureDatabase();
  const fuzzyTokenStream = buildFuzzyTokenStream(
    `${input.title}\n${input.body}`,
    FUZZY_DOC_MAX_TOKENS
  );

  const run = database.transaction((doc: SearchDocumentInput, fuzzyTokens: string) => {
    const existing = database
      .prepare('SELECT id FROM search_docs WHERE doc_id = ?')
      .get(doc.docId) as { id: number } | undefined;

    if (existing) {
      database
        .prepare(
          `UPDATE search_docs
           SET kind = ?, vault_path = ?, entity_key = ?, title = ?, updated_at = ?, digest = ?,
               file_path = ?, relative_path = ?, file_name = ?, session_id = ?
           WHERE doc_id = ?`
        )
        .run(
          doc.kind,
          doc.vaultPath,
          doc.entityKey,
          doc.title,
          doc.updatedAt,
          doc.digest,
          doc.filePath ?? null,
          doc.relativePath ?? null,
          doc.fileName ?? null,
          doc.sessionId ?? null,
          doc.docId
        );

      database.prepare('DELETE FROM search_fts_exact WHERE rowid = ?').run(existing.id);
      database.prepare('DELETE FROM search_fts_fuzzy WHERE rowid = ?').run(existing.id);
      database
        .prepare('INSERT INTO search_fts_exact(rowid, title, body) VALUES (?, ?, ?)')
        .run(existing.id, doc.title, doc.body);
      database
        .prepare('INSERT INTO search_fts_fuzzy(rowid, tokens) VALUES (?, ?)')
        .run(existing.id, fuzzyTokens);
      return;
    }

    const insertResult = database
      .prepare(
        `INSERT INTO search_docs(
          doc_id, kind, vault_path, entity_key, title, updated_at, digest,
          file_path, relative_path, file_name, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        doc.docId,
        doc.kind,
        doc.vaultPath,
        doc.entityKey,
        doc.title,
        doc.updatedAt,
        doc.digest,
        doc.filePath ?? null,
        doc.relativePath ?? null,
        doc.fileName ?? null,
        doc.sessionId ?? null
      );

    const rowId = Number(insertResult.lastInsertRowid);
    database
      .prepare('INSERT INTO search_fts_exact(rowid, title, body) VALUES (?, ?, ?)')
      .run(rowId, doc.title, doc.body);
    database
      .prepare('INSERT INTO search_fts_fuzzy(rowid, tokens) VALUES (?, ?)')
      .run(rowId, fuzzyTokens);
  });

  run(input, fuzzyTokenStream);
};

export const deleteSearchDocumentById = (docId: string): void => {
  const database = ensureDatabase();

  const run = database.transaction((targetDocId: string) => {
    const existing = database
      .prepare('SELECT id FROM search_docs WHERE doc_id = ?')
      .get(targetDocId) as { id: number } | undefined;

    if (!existing) {
      return;
    }

    database.prepare('DELETE FROM search_fts_exact WHERE rowid = ?').run(existing.id);
    database.prepare('DELETE FROM search_fts_fuzzy WHERE rowid = ?').run(existing.id);
    database.prepare('DELETE FROM search_docs WHERE id = ?').run(existing.id);
  });

  run(docId);
};

export const deleteSearchDocumentsByIds = (docIds: string[]): void => {
  if (docIds.length === 0) {
    return;
  }

  const database = ensureDatabase();

  const run = database.transaction((targets: string[]) => {
    for (const docId of targets) {
      const existing = database
        .prepare('SELECT id FROM search_docs WHERE doc_id = ?')
        .get(docId) as { id: number } | undefined;

      if (!existing) {
        continue;
      }

      database.prepare('DELETE FROM search_fts_exact WHERE rowid = ?').run(existing.id);
      database.prepare('DELETE FROM search_fts_fuzzy WHERE rowid = ?').run(existing.id);
      database.prepare('DELETE FROM search_docs WHERE id = ?').run(existing.id);
    }
  });

  run(docIds);
};

export const querySearchDocuments = (input: {
  kind: SearchDocumentKind;
  mode: SearchQueryMode;
  vaultPath: string;
  query: string;
  limit: number;
}): QueryDocumentRow[] => {
  const database = ensureDatabase();
  const matchQuery = buildMatchQueryByMode(input.mode, input.query);
  if (!matchQuery) {
    return [];
  }

  const ftsTable = SEARCH_TABLE_BY_MODE[input.mode];
  const rows = database
    .prepare(
      `SELECT d.id, d.doc_id, d.kind, d.vault_path, d.entity_key, d.title, d.updated_at, d.digest,
              d.file_path, d.relative_path, d.file_name, d.session_id,
              bm25(${ftsTable}) AS rank
       FROM ${ftsTable}
       JOIN search_docs d ON d.id = ${ftsTable}.rowid
       WHERE ${ftsTable} MATCH ? AND d.kind = ? AND d.vault_path = ?
       ORDER BY rank
       LIMIT ?`
    )
    .all(matchQuery, input.kind, input.vaultPath, input.limit) as Record<string, unknown>[];

  return rows.map((row) => {
    const meta = mapDocumentRow(row);
    const rank = Number(row['rank']);
    return {
      ...meta,
      rank: Number.isFinite(rank) ? rank : 0,
    };
  });
};
