import path from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { encodeProfileKeyForFs } from '../cloud-sync/profile-storage.js';

const MEMORY_INDEXING_PROFILE_ROOT = path.join('.moryflow', 'memory-indexing');
const MEMORY_INDEXING_PROFILE_STATE_FILE = 'uploaded-documents.json';
const CURRENT_VERSION = 1;

interface MemoryIndexingProfileStore {
  version: number;
  workspaceId: string;
  uploadedDocumentIds: string[];
}

interface MemoryIndexingProfileState {
  workspaceId: string;
  uploadedDocumentIds: Set<string>;
}

const cache = new Map<string, MemoryIndexingProfileState>();

const getCacheKey = (workspacePath: string, profileKey: string): string =>
  `${workspacePath}::${profileKey}`;

const getStatePath = (workspacePath: string, profileKey: string): string =>
  path.join(
    workspacePath,
    MEMORY_INDEXING_PROFILE_ROOT,
    encodeProfileKeyForFs(profileKey),
    MEMORY_INDEXING_PROFILE_STATE_FILE
  );

const cloneState = (state: MemoryIndexingProfileState): MemoryIndexingProfileState => ({
  workspaceId: state.workspaceId,
  uploadedDocumentIds: new Set(state.uploadedDocumentIds),
});

const setState = (
  workspacePath: string,
  profileKey: string,
  state: MemoryIndexingProfileState
): void => {
  cache.set(getCacheKey(workspacePath, profileKey), cloneState(state));
};

const saveState = async (
  workspacePath: string,
  profileKey: string,
  state: MemoryIndexingProfileState
): Promise<void> => {
  const statePath = getStatePath(workspacePath, profileKey);
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(
    statePath,
    JSON.stringify(
      {
        version: CURRENT_VERSION,
        workspaceId: state.workspaceId,
        uploadedDocumentIds: [...state.uploadedDocumentIds].sort(),
      } satisfies MemoryIndexingProfileStore,
      null,
      2
    )
  );
};

const loadState = async (
  workspacePath: string,
  profileKey: string
): Promise<MemoryIndexingProfileState | null> => {
  const raw = await readFile(getStatePath(workspacePath, profileKey), 'utf8');
  const parsed = JSON.parse(raw) as Partial<MemoryIndexingProfileStore>;
  if (
    parsed.version !== CURRENT_VERSION ||
    typeof parsed.workspaceId !== 'string' ||
    !Array.isArray(parsed.uploadedDocumentIds)
  ) {
    return null;
  }

  const uploadedDocumentIds = new Set(
    parsed.uploadedDocumentIds.filter((item): item is string => typeof item === 'string')
  );
  return {
    workspaceId: parsed.workspaceId,
    uploadedDocumentIds,
  };
};

const ensureWorkspaceState = async (
  workspacePath: string,
  profileKey: string,
  workspaceId: string
): Promise<MemoryIndexingProfileState> => {
  const cacheKey = getCacheKey(workspacePath, profileKey);
  const cached = cache.get(cacheKey);
  if (cached?.workspaceId === workspaceId) {
    return cloneState(cached);
  }

  let nextState: MemoryIndexingProfileState | null = null;
  try {
    const loaded = await loadState(workspacePath, profileKey);
    if (loaded?.workspaceId === workspaceId) {
      nextState = loaded;
    }
  } catch {
    nextState = null;
  }

  if (!nextState) {
    nextState = {
      workspaceId,
      uploadedDocumentIds: new Set(),
    };
    setState(workspacePath, profileKey, nextState);
    await saveState(workspacePath, profileKey, nextState);
    return cloneState(nextState);
  }

  setState(workspacePath, profileKey, nextState);
  return cloneState(nextState);
};

export const memoryIndexingProfileState = {
  async listUploadedDocumentIds(
    workspacePath: string,
    profileKey: string,
    workspaceId: string
  ): Promise<Set<string>> {
    const state = await ensureWorkspaceState(workspacePath, profileKey, workspaceId);
    return new Set(state.uploadedDocumentIds);
  },

  async markUploadedDocument(
    workspacePath: string,
    profileKey: string,
    workspaceId: string,
    documentId: string
  ): Promise<void> {
    const state = await ensureWorkspaceState(workspacePath, profileKey, workspaceId);
    if (state.uploadedDocumentIds.has(documentId)) {
      return;
    }
    state.uploadedDocumentIds.add(documentId);
    setState(workspacePath, profileKey, state);
    await saveState(workspacePath, profileKey, state);
  },

  async removeUploadedDocument(
    workspacePath: string,
    profileKey: string,
    workspaceId: string,
    documentId: string
  ): Promise<void> {
    const state = await ensureWorkspaceState(workspacePath, profileKey, workspaceId);
    if (!state.uploadedDocumentIds.has(documentId)) {
      return;
    }
    state.uploadedDocumentIds.delete(documentId);
    setState(workspacePath, profileKey, state);
    await saveState(workspacePath, profileKey, state);
  },

  clearCache(workspacePath: string, profileKey?: string): void {
    if (profileKey) {
      cache.delete(getCacheKey(workspacePath, profileKey));
      return;
    }

    for (const cacheKey of cache.keys()) {
      if (cacheKey.startsWith(workspacePath + '::')) {
        cache.delete(cacheKey);
      }
    }
  },

  async clear(workspacePath: string, profileKey: string): Promise<void> {
    this.clearCache(workspacePath, profileKey);
    await rm(getStatePath(workspacePath, profileKey), { force: true });
  },
};
