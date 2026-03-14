import crypto from 'node:crypto';
import { normalizeSyncPath } from '@moryflow/sync';
import {
  clearWorkspaceDocRegistryStore,
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

type RegistryCache = Map<string, RegistryState>;

const cache: RegistryCache = new Map();

const createRegistryState = (
  entries: WorkspaceDocumentEntry[],
): RegistryState => {
  const nextEntries = [...entries];
  return {
    entries: nextEntries,
    byPath: new Map(nextEntries.map((entry) => [entry.path, entry])),
    byDocumentId: new Map(
      nextEntries.map((entry) => [entry.documentId, entry]),
    ),
  };
};

const getState = (workspacePath: string): RegistryState | null =>
  cache.get(workspacePath) ?? null;

const getEntries = (workspacePath: string): WorkspaceDocumentEntry[] =>
  getState(workspacePath)?.entries ?? [];

const setEntries = (workspacePath: string, entries: WorkspaceDocumentEntry[]) => {
  cache.set(workspacePath, createRegistryState(entries));
};

const normalizePath = (relativePath: string): string =>
  normalizeSyncPath(relativePath);

const loadIntoCache = async (
  workspacePath: string,
): Promise<RegistryState> => {
  const existing = getState(workspacePath);
  if (existing) {
    return existing;
  }
  const store = await loadWorkspaceDocRegistryStore(workspacePath);
  setEntries(workspacePath, store.entries);
  return getState(workspacePath)!;
};

export const workspaceDocRegistry = {
  async load(workspacePath: string): Promise<void> {
    await loadIntoCache(workspacePath);
  },

  clearCache(workspacePath: string): void {
    cache.delete(workspacePath);
  },

  async sync(
    workspacePath: string,
    options?: {
      retainMissingDocumentIds?: Set<string>;
    },
  ): Promise<WorkspaceDocumentEntry[]> {
    const previousState = await loadIntoCache(workspacePath);
    const previousEntries = previousState.entries;
    const candidates = await scanWorkspaceDocuments(workspacePath);
    const existingByPath = new Map(
      previousEntries.map((entry) => [entry.path, entry]),
    );
    const existingByFingerprint = new Map(
      previousEntries.map((entry) => [entry.fingerprint, entry]),
    );
    const usedDocumentIds = new Set<string>();

    const nextEntries = candidates.map((candidate) => {
      const normalizedPath = normalizePath(candidate.path);
      const matched =
        existingByPath.get(normalizedPath) ??
        existingByFingerprint.get(candidate.fingerprint) ??
        null;

      if (matched) {
        usedDocumentIds.add(matched.documentId);
        return {
          documentId: matched.documentId,
          path: normalizedPath,
          fingerprint: candidate.fingerprint,
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

    setEntries(workspacePath, nextEntries);
    await saveWorkspaceDocRegistryStore(workspacePath, nextEntries);
    return [...nextEntries];
  },

  async getByPath(
    workspacePath: string,
    relativePath: string,
  ): Promise<WorkspaceDocumentEntry | null> {
    const state = await loadIntoCache(workspacePath);
    return state.byPath.get(normalizePath(relativePath)) ?? null;
  },

  async getByDocumentId(
    workspacePath: string,
    documentId: string,
  ): Promise<WorkspaceDocumentEntry | null> {
    const state = await loadIntoCache(workspacePath);
    return state.byDocumentId.get(documentId) ?? null;
  },

  async ensureDocumentId(
    workspacePath: string,
    relativePath: string,
  ): Promise<string> {
    const entry = await this.getByPath(workspacePath, relativePath);
    if (entry) {
      return entry.documentId;
    }

    const synced = await this.sync(workspacePath);
    const refreshed =
      (await this.getByPath(workspacePath, relativePath)) ??
      synced.find((item) => item.path === normalizePath(relativePath));
    if (!refreshed) {
      throw new Error(`Document not found in workspace registry: ${relativePath}`);
    }

    return refreshed.documentId;
  },

  async delete(
    workspacePath: string,
    relativePath: string,
  ): Promise<string | null> {
    const state = await loadIntoCache(workspacePath);
    const normalizedPath = normalizePath(relativePath);
    const removed = state.byPath.get(normalizedPath) ?? null;
    if (!removed) {
      return null;
    }

    const nextEntries = state.entries.filter((entry) => entry.path !== normalizedPath);
    setEntries(workspacePath, nextEntries);
    await saveWorkspaceDocRegistryStore(workspacePath, nextEntries);
    return removed?.documentId ?? null;
  },

  async move(
    workspacePath: string,
    oldRelativePath: string,
    newRelativePath: string,
  ): Promise<void> {
    const state = await loadIntoCache(workspacePath);
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
        : entry,
    );
    setEntries(workspacePath, nextEntries);
    await saveWorkspaceDocRegistryStore(workspacePath, nextEntries);
  },

  async getAll(workspacePath: string): Promise<WorkspaceDocumentEntry[]> {
    const state = await loadIntoCache(workspacePath);
    return [...state.entries];
  },

  async clear(workspacePath: string): Promise<void> {
    cache.delete(workspacePath);
    await clearWorkspaceDocRegistryStore(workspacePath);
  },
};
