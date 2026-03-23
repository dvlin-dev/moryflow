import crypto from 'node:crypto';
import { rm } from 'node:fs/promises';
import { normalizeSyncPath } from '@moryflow/sync';
import {
  clearWorkspaceDocRegistryStore,
  getWorkspaceDocRegistryRootPath,
  loadWorkspaceDocRegistryStore,
  saveWorkspaceDocRegistryStore,
  type WorkspaceDocumentEntry,
} from './store.js';
import { scanWorkspaceDocuments } from './scanner.js';

interface RegistryState {
  entries: WorkspaceDocumentEntry[];
  byPath: Map<string, WorkspaceDocumentEntry>;
  byDocumentId: Map<string, WorkspaceDocumentEntry>;
}

interface DeleteWorkspaceDocumentInput {
  relativePath: string;
  expectedDocumentId?: string;
}

type RegistryCache = Map<string, RegistryState>;

const cache: RegistryCache = new Map();

const getCacheKey = (workspacePath: string, profileKey: string, workspaceId: string): string =>
  `${workspacePath}::${profileKey}::${workspaceId}`;

const createRegistryState = (entries: WorkspaceDocumentEntry[]): RegistryState => {
  const nextEntries = [...entries];
  return {
    entries: nextEntries,
    byPath: new Map(nextEntries.map((entry) => [entry.path, entry])),
    byDocumentId: new Map(nextEntries.map((entry) => [entry.documentId, entry])),
  };
};

const getState = (
  workspacePath: string,
  profileKey: string,
  workspaceId: string
): RegistryState | null => cache.get(getCacheKey(workspacePath, profileKey, workspaceId)) ?? null;

const setEntries = (
  workspacePath: string,
  profileKey: string,
  workspaceId: string,
  entries: WorkspaceDocumentEntry[]
) => {
  cache.set(getCacheKey(workspacePath, profileKey, workspaceId), createRegistryState(entries));
};

const normalizePath = (relativePath: string): string => normalizeSyncPath(relativePath);

const loadIntoCache = async (
  workspacePath: string,
  profileKey: string,
  workspaceId: string
): Promise<RegistryState> => {
  const existing = getState(workspacePath, profileKey, workspaceId);
  if (existing) {
    return existing;
  }
  const store = await loadWorkspaceDocRegistryStore(workspacePath, profileKey, workspaceId);
  setEntries(workspacePath, profileKey, workspaceId, store.entries);
  return getState(workspacePath, profileKey, workspaceId)!;
};

export const workspaceDocRegistry = {
  async load(workspacePath: string, profileKey: string, workspaceId: string): Promise<void> {
    await loadIntoCache(workspacePath, profileKey, workspaceId);
  },

  clearCache(workspacePath: string, profileKey?: string, workspaceId?: string): void {
    if (profileKey && workspaceId) {
      cache.delete(getCacheKey(workspacePath, profileKey, workspaceId));
      return;
    }

    const prefix =
      profileKey && workspaceId === undefined
        ? `${workspacePath}::${profileKey}::`
        : `${workspacePath}::`;
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  },

  async sync(
    workspacePath: string,
    profileKey: string,
    workspaceId: string,
    options?: {
      retainMissingDocumentIds?: Set<string>;
    }
  ): Promise<WorkspaceDocumentEntry[]> {
    const previousState = await loadIntoCache(workspacePath, profileKey, workspaceId);
    const previousEntries = previousState.entries;
    const candidates = await scanWorkspaceDocuments(workspacePath);
    const existingByPath = new Map(previousEntries.map((entry) => [entry.path, entry]));
    const existingByFingerprint = new Map(
      previousEntries.map((entry) => [entry.fingerprint, entry])
    );
    const usedDocumentIds = new Set<string>();

    const nextEntries = candidates.map((candidate) => {
      const normalizedPath = normalizePath(candidate.path);
      const matchedByPath = existingByPath.get(normalizedPath) ?? null;
      const matchedByFingerprint =
        !matchedByPath &&
        !usedDocumentIds.has(existingByFingerprint.get(candidate.fingerprint)?.documentId ?? '')
          ? (existingByFingerprint.get(candidate.fingerprint) ?? null)
          : null;
      const matched = matchedByPath ?? matchedByFingerprint;

      if (matched) {
        usedDocumentIds.add(matched.documentId);
        // Remove consumed fingerprint entry to prevent a second file
        // with the same fingerprint from reusing the same documentId.
        if (matchedByFingerprint) {
          existingByFingerprint.delete(candidate.fingerprint);
        }
        return {
          documentId: matched.documentId,
          path: normalizedPath,
          fingerprint: candidate.fingerprint,
          contentFingerprint: candidate.contentFingerprint,
        };
      }

      let documentId = crypto.randomUUID();
      while (usedDocumentIds.has(documentId)) {
        documentId = crypto.randomUUID();
      }
      usedDocumentIds.add(documentId);
      return {
        documentId,
        path: normalizedPath,
        fingerprint: candidate.fingerprint,
        contentFingerprint: candidate.contentFingerprint,
      };
    });

    const retainMissingDocumentIds = options?.retainMissingDocumentIds;
    if (retainMissingDocumentIds?.size) {
      for (const previousEntry of previousEntries) {
        if (!retainMissingDocumentIds.has(previousEntry.documentId)) {
          continue;
        }
        if (usedDocumentIds.has(previousEntry.documentId)) {
          continue;
        }
        usedDocumentIds.add(previousEntry.documentId);
        nextEntries.push(previousEntry);
      }
    }

    setEntries(workspacePath, profileKey, workspaceId, nextEntries);
    await saveWorkspaceDocRegistryStore(workspacePath, profileKey, workspaceId, nextEntries);
    return [...nextEntries];
  },

  async getByPath(
    workspacePath: string,
    profileKey: string,
    workspaceId: string,
    relativePath: string
  ): Promise<WorkspaceDocumentEntry | null> {
    const state = await loadIntoCache(workspacePath, profileKey, workspaceId);
    return state.byPath.get(normalizePath(relativePath)) ?? null;
  },

  async getByDocumentId(
    workspacePath: string,
    profileKey: string,
    workspaceId: string,
    documentId: string
  ): Promise<WorkspaceDocumentEntry | null> {
    const state = await loadIntoCache(workspacePath, profileKey, workspaceId);
    return state.byDocumentId.get(documentId) ?? null;
  },

  async ensureDocumentId(
    workspacePath: string,
    profileKey: string,
    workspaceId: string,
    relativePath: string
  ): Promise<string> {
    const entry = await this.getByPath(workspacePath, profileKey, workspaceId, relativePath);
    if (entry) {
      return entry.documentId;
    }

    const synced = await this.sync(workspacePath, profileKey, workspaceId);
    const refreshed =
      (await this.getByPath(workspacePath, profileKey, workspaceId, relativePath)) ??
      synced.find((item) => item.path === normalizePath(relativePath));
    if (!refreshed) {
      throw new Error(`Document not found in workspace registry: ${relativePath}`);
    }

    return refreshed.documentId;
  },

  async delete(
    workspacePath: string,
    profileKey: string,
    workspaceId: string,
    input: DeleteWorkspaceDocumentInput
  ): Promise<string | null> {
    const state = await loadIntoCache(workspacePath, profileKey, workspaceId);
    const normalizedPath = normalizePath(input.relativePath);
    const removed = state.byPath.get(normalizedPath) ?? null;
    if (!removed) {
      return null;
    }
    if (input.expectedDocumentId && removed.documentId !== input.expectedDocumentId) {
      return null;
    }

    const nextEntries = state.entries.filter((entry) => entry.documentId !== removed.documentId);
    setEntries(workspacePath, profileKey, workspaceId, nextEntries);
    await saveWorkspaceDocRegistryStore(workspacePath, profileKey, workspaceId, nextEntries);
    return removed?.documentId ?? null;
  },

  async move(
    workspacePath: string,
    profileKey: string,
    workspaceId: string,
    oldRelativePath: string,
    newRelativePath: string
  ): Promise<void> {
    const state = await loadIntoCache(workspacePath, profileKey, workspaceId);
    const normalizedOldPath = normalizePath(oldRelativePath);
    const normalizedNewPath = normalizePath(newRelativePath);
    const target = state.byPath.get(normalizedOldPath) ?? null;

    if (!target) {
      return;
    }

    const nextEntries = state.entries.map((entry) =>
      entry.documentId === target.documentId
        ? {
            ...entry,
            path: normalizedNewPath,
          }
        : entry
    );
    setEntries(workspacePath, profileKey, workspaceId, nextEntries);
    await saveWorkspaceDocRegistryStore(workspacePath, profileKey, workspaceId, nextEntries);
  },

  async getAll(
    workspacePath: string,
    profileKey: string,
    workspaceId: string
  ): Promise<WorkspaceDocumentEntry[]> {
    const state = await loadIntoCache(workspacePath, profileKey, workspaceId);
    return [...state.entries];
  },

  async clear(workspacePath: string, profileKey?: string, workspaceId?: string): Promise<void> {
    this.clearCache(workspacePath, profileKey, workspaceId);
    if (profileKey && workspaceId) {
      await clearWorkspaceDocRegistryStore(workspacePath, profileKey, workspaceId);
      return;
    }
    await rm(getWorkspaceDocRegistryRootPath(workspacePath), { recursive: true, force: true });
  },
};
