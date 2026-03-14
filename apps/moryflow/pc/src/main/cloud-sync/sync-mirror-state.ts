import path from 'node:path';
import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import type { VectorClock } from '@moryflow/sync';
import { getCloudSyncProfileStatePath } from './profile-storage.js';

export interface SyncMirrorEntry {
  documentId: string;
  path: string;
  createdAt: number;
  vectorClock: VectorClock;
  lastSyncedHash: string | null;
  lastSyncedClock: VectorClock;
  lastSyncedSize: number | null;
  lastSyncedMtime: number | null;
  lastSyncedStorageRevision: string | null;
}

interface SyncMirrorStore {
  version: 1;
  entries: SyncMirrorEntry[];
}

interface SyncMirrorCacheState {
  entries: SyncMirrorEntry[];
  byDocumentId: Map<string, SyncMirrorEntry>;
  indexByDocumentId: Map<string, number>;
}

type SyncMirrorMutator = {
  get: (documentId: string) => SyncMirrorEntry | undefined;
  ensure: (documentId: string, relativePath: string) => SyncMirrorEntry;
  update: (
    documentId: string,
    updates: Partial<
      Pick<
        SyncMirrorEntry,
        | 'path'
        | 'vectorClock'
        | 'lastSyncedHash'
        | 'lastSyncedClock'
        | 'lastSyncedSize'
        | 'lastSyncedMtime'
        | 'lastSyncedStorageRevision'
      >
    >,
  ) => void;
  delete: (documentId: string) => void;
};

const SYNC_MIRROR_FILE = 'sync-mirror.json';
const cache = new Map<string, SyncMirrorCacheState>();

const getCacheKey = (workspacePath: string, profileKey: string): string =>
  `${workspacePath}::${profileKey}`;

const getStatePath = (workspacePath: string, profileKey: string): string =>
  getCloudSyncProfileStatePath(workspacePath, profileKey, SYNC_MIRROR_FILE);

const cloneEntry = (entry: SyncMirrorEntry): SyncMirrorEntry => ({
  ...entry,
  vectorClock: { ...entry.vectorClock },
  lastSyncedClock: { ...entry.lastSyncedClock },
});

const createCacheState = (
  entries: SyncMirrorEntry[],
): SyncMirrorCacheState => {
  const nextEntries = entries.map(cloneEntry);
  return {
    entries: nextEntries,
    byDocumentId: new Map(
      nextEntries.map((entry) => [entry.documentId, entry]),
    ),
    indexByDocumentId: new Map(
      nextEntries.map((entry, index) => [entry.documentId, index]),
    ),
  };
};

const getState = (
  workspacePath: string,
  profileKey: string,
): SyncMirrorCacheState | null =>
  cache.get(getCacheKey(workspacePath, profileKey)) ?? null;

const getEntries = (workspacePath: string, profileKey: string): SyncMirrorEntry[] =>
  getState(workspacePath, profileKey)?.entries ?? [];

const setEntries = (
  workspacePath: string,
  profileKey: string,
  entries: SyncMirrorEntry[],
): void => {
  cache.set(getCacheKey(workspacePath, profileKey), createCacheState(entries));
};

const saveStore = async (
  workspacePath: string,
  profileKey: string,
): Promise<void> => {
  const statePath = getStatePath(workspacePath, profileKey);
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(
    statePath,
    JSON.stringify(
      {
        version: 1,
        entries: getEntries(workspacePath, profileKey),
      } satisfies SyncMirrorStore,
      null,
      2,
    ),
    'utf8',
  );
};

const createEntry = (
  documentId: string,
  relativePath: string,
): SyncMirrorEntry => ({
  documentId,
  path: relativePath,
  createdAt: Date.now(),
  vectorClock: {},
  lastSyncedHash: null,
  lastSyncedClock: {},
  lastSyncedSize: null,
  lastSyncedMtime: null,
  lastSyncedStorageRevision: null,
});

export const loadSyncMirror = async (
  workspacePath: string,
  profileKey: string,
): Promise<void> => {
  const key = getCacheKey(workspacePath, profileKey);
  if (cache.has(key)) {
    return;
  }

  try {
    const raw = await readFile(getStatePath(workspacePath, profileKey), 'utf8');
    const parsed = JSON.parse(raw) as SyncMirrorStore;
    if (parsed.version !== 1) {
      throw new Error('Unsupported sync mirror store version');
    }
    setEntries(workspacePath, profileKey, parsed.entries ?? []);
  } catch {
    setEntries(workspacePath, profileKey, []);
  }
};

export const clearSyncMirrorCache = (
  workspacePath: string,
  profileKey: string,
): void => {
  cache.delete(getCacheKey(workspacePath, profileKey));
};

export const resetSyncMirror = async (
  workspacePath: string,
  profileKey: string,
): Promise<void> => {
  clearSyncMirrorCache(workspacePath, profileKey);
  await rm(getStatePath(workspacePath, profileKey), { force: true });
};

export const getSyncMirrorEntry = (
  workspacePath: string,
  profileKey: string,
  documentId: string,
): SyncMirrorEntry | undefined =>
  getState(workspacePath, profileKey)?.byDocumentId.get(documentId);

export const getAllSyncMirrorEntries = (
  workspacePath: string,
  profileKey: string,
): SyncMirrorEntry[] => [...getEntries(workspacePath, profileKey)];

export const ensureSyncMirrorEntry = async (
  workspacePath: string,
  profileKey: string,
  documentId: string,
  relativePath: string,
): Promise<SyncMirrorEntry> => {
  await loadSyncMirror(workspacePath, profileKey);
  const existing = getSyncMirrorEntry(workspacePath, profileKey, documentId);
  if (existing) {
    if (existing.path !== relativePath) {
      const nextEntries = getEntries(workspacePath, profileKey).map((entry) =>
        entry.documentId === documentId
          ? {
              ...entry,
              path: relativePath,
            }
          : entry,
      );
      setEntries(workspacePath, profileKey, nextEntries);
      await saveStore(workspacePath, profileKey);
    }
    return getSyncMirrorEntry(workspacePath, profileKey, documentId)!;
  }

  const next = createEntry(documentId, relativePath);
  const entries = [...getEntries(workspacePath, profileKey), next];
  setEntries(workspacePath, profileKey, entries);
  await saveStore(workspacePath, profileKey);
  return getSyncMirrorEntry(workspacePath, profileKey, documentId)!;
};

export const updateSyncMirrorEntry = async (
  workspacePath: string,
  profileKey: string,
  documentId: string,
  updates: Partial<
    Pick<
      SyncMirrorEntry,
      | 'path'
      | 'vectorClock'
      | 'lastSyncedHash'
      | 'lastSyncedClock'
      | 'lastSyncedSize'
      | 'lastSyncedMtime'
      | 'lastSyncedStorageRevision'
    >
  >,
): Promise<void> => {
  await loadSyncMirror(workspacePath, profileKey);
  const existing = getSyncMirrorEntry(workspacePath, profileKey, documentId);
  if (!existing) {
    return;
  }
  const entries = getEntries(workspacePath, profileKey).map((entry) =>
    entry.documentId === documentId
      ? {
          ...entry,
          ...updates,
        }
      : entry,
  );
  setEntries(workspacePath, profileKey, entries);
  await saveStore(workspacePath, profileKey);
};

export const deleteSyncMirrorEntry = async (
  workspacePath: string,
  profileKey: string,
  documentId: string,
): Promise<void> => {
  await loadSyncMirror(workspacePath, profileKey);
  const next = getEntries(workspacePath, profileKey).filter(
    (entry) => entry.documentId !== documentId,
  );
  setEntries(workspacePath, profileKey, next);
  await saveStore(workspacePath, profileKey);
};

export const mutateSyncMirror = async (
  workspacePath: string,
  profileKey: string,
  mutate: (draft: SyncMirrorMutator) => void,
): Promise<void> => {
  await loadSyncMirror(workspacePath, profileKey);
  const draftEntries = getEntries(workspacePath, profileKey).map(cloneEntry);
  const draftByDocumentId = new Map(
    draftEntries.map((entry) => [entry.documentId, entry]),
  );
  const draftIndexByDocumentId = new Map(
    draftEntries.map((entry, index) => [entry.documentId, index]),
  );
  let dirty = false;

  const upsertEntry = (
    documentId: string,
    updater: (entry: SyncMirrorEntry) => SyncMirrorEntry,
  ): SyncMirrorEntry => {
    const existing = draftByDocumentId.get(documentId);
    const next = updater(existing ?? createEntry(documentId, ''));
    if (!existing) {
      draftEntries.push(next);
      draftIndexByDocumentId.set(documentId, draftEntries.length - 1);
    } else {
      const index = draftIndexByDocumentId.get(documentId) ?? -1;
      if (index !== -1) {
        draftEntries[index] = next;
      }
    }
    draftByDocumentId.set(documentId, next);
    dirty = true;
    return next;
  };

  mutate({
    get: (documentId) => draftByDocumentId.get(documentId),
    ensure: (documentId, relativePath) =>
      upsertEntry(documentId, (entry) => ({
        ...entry,
        path: relativePath,
      })),
    update: (documentId, updates) => {
      const existing = draftByDocumentId.get(documentId);
      if (!existing) {
        return;
      }
      upsertEntry(documentId, (entry) => ({
        ...entry,
        ...updates,
      }));
    },
    delete: (documentId) => {
      if (!draftByDocumentId.has(documentId)) {
        return;
      }
      draftByDocumentId.delete(documentId);
      const index = draftIndexByDocumentId.get(documentId) ?? -1;
      if (index !== -1) {
        draftEntries.splice(index, 1);
        draftIndexByDocumentId.delete(documentId);
        for (let nextIndex = index; nextIndex < draftEntries.length; nextIndex += 1) {
          draftIndexByDocumentId.set(draftEntries[nextIndex]!.documentId, nextIndex);
        }
      }
      dirty = true;
    },
  });

  if (!dirty) {
    return;
  }

  setEntries(workspacePath, profileKey, draftEntries);
  await saveStore(workspacePath, profileKey);
};
