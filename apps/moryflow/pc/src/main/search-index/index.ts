/**
 * [PROVIDES]: searchIndexService - 全局搜索索引编排服务
 * [DEPENDS]: vault context, file/thread indexer, query layer
 * [POS]: PC main 全局搜索服务入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type {
  SearchQueryInput,
  SearchQueryResult,
  SearchRebuildResult,
  SearchStatus,
} from '../../shared/ipc/search.js';
import { resolveChatSessionProfileKey } from '../chat-session-store/scope.js';
import { getStoredVault } from '../vault/index.js';
import { createFileIndexer } from './file-indexer.js';
import { runSearchQuery } from './query.js';
import {
  countSearchDocumentsByKind,
  deleteSearchDocumentsByIds,
  getSearchIndexStatus,
  listSearchDocumentsByKind,
  markSearchIndexBuilding,
  markSearchIndexError,
  markSearchIndexReady,
} from './store.js';
import { createThreadIndexer } from './thread-indexer.js';
import { DEFAULT_LIMIT_PER_GROUP, MAX_LIMIT_PER_GROUP, MIN_QUERY_LENGTH } from './types.js';

const fileIndexer = createFileIndexer();
const threadIndexer = createThreadIndexer();
let rebuildPromise: Promise<SearchRebuildResult> | null = null;
let rebuildTargetScopeKey: string | null = null;
let indexedVaultPath: string | null = null;
let indexedProfileKey: string | null = null;

const buildSearchScopeKey = (vaultPath: string, profileKey: string | null): string =>
  `${vaultPath}::${profileKey ?? 'anonymous'}`;

const resolveCurrentSearchScope = async (
  explicitVaultPath?: string
): Promise<{ vaultPath: string; profileKey: string | null } | null> => {
  const vaultPath = explicitVaultPath ?? (await getStoredVault())?.path ?? null;
  if (!vaultPath) {
    return null;
  }

  return {
    vaultPath,
    profileKey: await resolveChatSessionProfileKey(vaultPath),
  };
};

const refreshIndexCounts = (vaultPath: string) => {
  const filesIndexed = countSearchDocumentsByKind('file', vaultPath);
  const threadsIndexed = countSearchDocumentsByKind('thread', vaultPath);
  markSearchIndexReady({ filesIndexed, threadsIndexed });
};

const refreshThreadIndexForScope = async (scope: {
  vaultPath: string;
  profileKey: string | null;
}) => {
  markSearchIndexBuilding();
  const threadsIndexed = await threadIndexer.rebuild(scope);
  indexedProfileKey = scope.profileKey;
  markSearchIndexReady({
    filesIndexed: countSearchDocumentsByKind('file', scope.vaultPath),
    threadsIndexed,
  });
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
    const currentProfileKey = await resolveChatSessionProfileKey(vault.path);
    const shouldRebuild =
      currentStatus.state === 'idle' ||
      currentStatus.state === 'error' ||
      indexedVaultPath !== vault.path;
    if (shouldRebuild) {
      await this.rebuild(vault.path);
    } else if (indexedProfileKey !== currentProfileKey) {
      await refreshThreadIndexForScope({
        vaultPath: vault.path,
        profileKey: currentProfileKey,
      });
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
      const currentScope = await resolveCurrentSearchScope(vaultPath);
      if (!currentScope) {
        return rebuildPromise;
      }
      if (
        buildSearchScopeKey(currentScope.vaultPath, currentScope.profileKey) ===
        rebuildTargetScopeKey
      ) {
        return rebuildPromise;
      }
      await rebuildPromise;
    }

    rebuildPromise = (async () => {
      try {
        const scope = await resolveCurrentSearchScope(vaultPath);
        if (!scope) {
          indexedVaultPath = null;
          indexedProfileKey = null;
          return {
            ok: true,
            status: getSearchIndexStatus(),
          };
        }

        rebuildTargetScopeKey = buildSearchScopeKey(scope.vaultPath, scope.profileKey);
        markSearchIndexBuilding();
        const [filesIndexed, threadsIndexed] = await Promise.all([
          fileIndexer.rebuild(scope.vaultPath),
          threadIndexer.rebuild(scope),
        ]);
        indexedVaultPath = scope.vaultPath;
        indexedProfileKey = scope.profileKey;
        markSearchIndexReady({ filesIndexed, threadsIndexed });
      } catch (error) {
        markSearchIndexError(error);
        throw error;
      } finally {
        rebuildTargetScopeKey = null;
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
    const scope =
      indexedVaultPath != null
        ? { vaultPath: indexedVaultPath, profileKey: indexedProfileKey }
        : undefined;
    await threadIndexer.onSessionUpsert(sessionId, scope);
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

  resetScope(): void {
    if (indexedVaultPath) {
      const staleThreadDocs = listSearchDocumentsByKind('thread', indexedVaultPath);
      if (staleThreadDocs.length > 0) {
        deleteSearchDocumentsByIds(staleThreadDocs.map((d) => d.docId));
      }
    }
    indexedVaultPath = null;
    indexedProfileKey = null;
    rebuildPromise = null;
    rebuildTargetScopeKey = null;
  },
};
