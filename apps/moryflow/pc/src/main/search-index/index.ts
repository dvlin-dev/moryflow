/**
 * [PROVIDES]: searchIndexService - 全局搜索索引编排服务
 * [DEPENDS]: vault context, file/thread indexer, query layer
 * [POS]: PC main 全局搜索服务入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type {
  SearchQueryInput,
  SearchQueryResult,
  SearchRebuildResult,
  SearchStatus,
} from '../../shared/ipc/search.js';
import { getStoredVault } from '../vault.js';
import { createFileIndexer } from './file-indexer.js';
import { runSearchQuery } from './query.js';
import {
  countSearchDocumentsByKind,
  getSearchIndexStatus,
  markSearchIndexBuilding,
  markSearchIndexError,
  markSearchIndexReady,
} from './store.js';
import { createThreadIndexer } from './thread-indexer.js';
import { DEFAULT_LIMIT_PER_GROUP, MAX_LIMIT_PER_GROUP, MIN_QUERY_LENGTH } from './types.js';

const fileIndexer = createFileIndexer();
const threadIndexer = createThreadIndexer();
let rebuildPromise: Promise<SearchRebuildResult> | null = null;
let rebuildTargetVaultPath: string | null = null;
let indexedVaultPath: string | null = null;

const refreshIndexCounts = (vaultPath: string) => {
  const filesIndexed = countSearchDocumentsByKind('file', vaultPath);
  const threadsIndexed = countSearchDocumentsByKind('thread', vaultPath);
  markSearchIndexReady({ filesIndexed, threadsIndexed });
};

const normalizeQueryInput = (input: SearchQueryInput): SearchQueryInput => {
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  const limitPerGroup =
    typeof input.limitPerGroup === 'number' && Number.isFinite(input.limitPerGroup)
      ? Math.min(MAX_LIMIT_PER_GROUP, Math.max(1, Math.floor(input.limitPerGroup)))
      : DEFAULT_LIMIT_PER_GROUP;
  return { query, limitPerGroup };
};

export const searchIndexService = {
  async query(input: SearchQueryInput): Promise<SearchQueryResult> {
    const start = Date.now();
    const normalized = normalizeQueryInput(input);
    if (normalized.query.length < MIN_QUERY_LENGTH) {
      return {
        files: [],
        threads: [],
        tookMs: Date.now() - start,
      };
    }

    const vault = await getStoredVault();
    if (!vault?.path) {
      return {
        files: [],
        threads: [],
        tookMs: Date.now() - start,
      };
    }

    const currentStatus = getSearchIndexStatus();
    const shouldRebuild =
      currentStatus.state === 'idle' ||
      currentStatus.state === 'error' ||
      currentStatus.state === 'building' ||
      indexedVaultPath !== vault.path;
    if (shouldRebuild) {
      await this.rebuild(vault.path);
    }

    try {
      const result = await runSearchQuery({
        query: normalized.query,
        limitPerGroup: normalized.limitPerGroup,
        vaultPath: vault.path,
      });
      return {
        ...result,
        tookMs: Date.now() - start,
      };
    } catch (error) {
      markSearchIndexError(error);
      throw error;
    }
  },

  async rebuild(vaultPath?: string): Promise<SearchRebuildResult> {
    if (rebuildPromise) {
      if (!vaultPath || vaultPath === rebuildTargetVaultPath) {
        return rebuildPromise;
      }
      await rebuildPromise;
    }

    rebuildPromise = (async () => {
      try {
        const resolvedVaultPath = vaultPath ?? (await getStoredVault())?.path ?? null;
        if (!resolvedVaultPath) {
          indexedVaultPath = null;
          return {
            ok: true,
            status: getSearchIndexStatus(),
          };
        }

        rebuildTargetVaultPath = resolvedVaultPath;
        markSearchIndexBuilding();
        const [filesIndexed, threadsIndexed] = await Promise.all([
          fileIndexer.rebuild(resolvedVaultPath),
          threadIndexer.rebuild(resolvedVaultPath),
        ]);
        indexedVaultPath = resolvedVaultPath;
        markSearchIndexReady({ filesIndexed, threadsIndexed });
      } catch (error) {
        markSearchIndexError(error);
        throw error;
      } finally {
        rebuildTargetVaultPath = null;
        rebuildPromise = null;
      }

      return {
        ok: true,
        status: getSearchIndexStatus(),
      };
    })();

    return rebuildPromise;
  },

  getStatus(): SearchStatus {
    return getSearchIndexStatus();
  },

  async onFileAddedOrChanged(filePath: string): Promise<void> {
    const vault = await getStoredVault();
    if (!vault?.path) {
      return;
    }
    await fileIndexer.onFileAddedOrChanged(vault.path, filePath);
    if (getSearchIndexStatus().state !== 'idle') {
      refreshIndexCounts(vault.path);
    }
  },

  async onFileDeleted(filePath: string): Promise<void> {
    const vault = await getStoredVault();
    if (!vault?.path) {
      return;
    }
    await fileIndexer.onFileDeleted(vault.path, filePath);
    if (getSearchIndexStatus().state !== 'idle') {
      refreshIndexCounts(vault.path);
    }
  },

  async onSessionUpsert(sessionId: string): Promise<void> {
    await threadIndexer.onSessionUpsert(sessionId);
    if (getSearchIndexStatus().state !== 'idle') {
      const vault = await getStoredVault();
      if (vault?.path) {
        refreshIndexCounts(vault.path);
      }
    }
  },

  async onSessionDelete(sessionId: string): Promise<void> {
    await threadIndexer.onSessionDelete(sessionId);
    if (getSearchIndexStatus().state !== 'idle') {
      const vault = await getStoredVault();
      if (vault?.path) {
        refreshIndexCounts(vault.path);
      }
    }
  },
};
