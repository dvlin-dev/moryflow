import path from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { encodeProfileKeyForFs } from '../cloud-sync/profile-storage.js';

export const WORKSPACE_DOC_REGISTRY_ROOT = path.join('.moryflow', 'document-registry');
export const WORKSPACE_DOC_REGISTRY_FILE = 'registry.json';
const LEGACY_WORKSPACE_DOC_REGISTRY_PATH = path.join('.moryflow', 'document-registry.json');
const CURRENT_VERSION = 2;

export interface WorkspaceDocumentEntry {
  documentId: string;
  path: string;
  // Stable file identity used to preserve documentId across rename/move.
  fingerprint: string;
  // Content-level fingerprint used by reconcile to detect offline edits
  // without replaying every unchanged document on startup/vault switch.
  contentFingerprint: string;
}

export interface WorkspaceDocumentRegistryStore {
  version: number;
  entries: WorkspaceDocumentEntry[];
}

const createEmptyStore = (): WorkspaceDocumentRegistryStore => ({
  version: CURRENT_VERSION,
  entries: [],
});

const normalizeEntries = (raw: unknown): WorkspaceDocumentEntry[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as {
      documentId?: unknown;
      path?: unknown;
      fingerprint?: unknown;
      contentFingerprint?: unknown;
    };

    if (
      typeof candidate.documentId !== 'string' ||
      typeof candidate.path !== 'string' ||
      typeof candidate.fingerprint !== 'string'
    ) {
      return [];
    }

    const rawFingerprint = candidate.fingerprint;
    const fingerprintParts = rawFingerprint.split(':');
    const migratedFingerprint =
      typeof candidate.contentFingerprint !== 'string' && fingerprintParts.length === 3
        ? fingerprintParts.slice(0, 2).join(':')
        : rawFingerprint;

    return [
      {
        documentId: candidate.documentId,
        path: candidate.path,
        fingerprint: migratedFingerprint,
        contentFingerprint:
          typeof candidate.contentFingerprint === 'string'
            ? candidate.contentFingerprint
            : rawFingerprint,
      },
    ];
  });
};

export const getWorkspaceDocRegistryRootPath = (workspacePath: string): string =>
  path.join(workspacePath, WORKSPACE_DOC_REGISTRY_ROOT);

export const getLegacyWorkspaceDocRegistryStorePath = (workspacePath: string): string =>
  path.join(workspacePath, LEGACY_WORKSPACE_DOC_REGISTRY_PATH);

export const getWorkspaceDocRegistryStorePath = (
  workspacePath: string,
  profileKey: string,
  workspaceId: string
): string =>
  path.join(
    getWorkspaceDocRegistryRootPath(workspacePath),
    encodeProfileKeyForFs(profileKey),
    workspaceId,
    WORKSPACE_DOC_REGISTRY_FILE
  );

const clearLegacyWorkspaceDocRegistryStore = async (workspacePath: string): Promise<void> => {
  await rm(getLegacyWorkspaceDocRegistryStorePath(workspacePath), { force: true });
};

export const loadWorkspaceDocRegistryStore = async (
  workspacePath: string,
  profileKey: string,
  workspaceId: string
): Promise<WorkspaceDocumentRegistryStore> => {
  await clearLegacyWorkspaceDocRegistryStore(workspacePath);
  try {
    const raw = await readFile(
      getWorkspaceDocRegistryStorePath(workspacePath, profileKey, workspaceId),
      'utf8'
    );
    const parsed = JSON.parse(raw) as Partial<WorkspaceDocumentRegistryStore>;
    if (!parsed || !Array.isArray(parsed.entries)) {
      return createEmptyStore();
    }

    // v1 entries did not persist contentFingerprint. Migrate in-memory so
    // existing documentIds remain stable after upgrading reconcile behavior.
    if (parsed.version === 1 || parsed.version === CURRENT_VERSION) {
      return {
        version: CURRENT_VERSION,
        entries: normalizeEntries(parsed.entries),
      };
    }

    return createEmptyStore();
  } catch {
    return createEmptyStore();
  }
};

export const saveWorkspaceDocRegistryStore = async (
  workspacePath: string,
  profileKey: string,
  workspaceId: string,
  entries: WorkspaceDocumentEntry[]
): Promise<void> => {
  const storePath = getWorkspaceDocRegistryStorePath(workspacePath, profileKey, workspaceId);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(
    storePath,
    JSON.stringify(
      {
        version: CURRENT_VERSION,
        entries,
      } satisfies WorkspaceDocumentRegistryStore,
      null,
      2
    )
  );
  await clearLegacyWorkspaceDocRegistryStore(workspacePath);
};

export const clearWorkspaceDocRegistryStore = async (
  workspacePath: string,
  profileKey: string,
  workspaceId: string
): Promise<void> => {
  await rm(getWorkspaceDocRegistryStorePath(workspacePath, profileKey, workspaceId), {
    force: true,
  });
  await clearLegacyWorkspaceDocRegistryStore(workspacePath);
};
