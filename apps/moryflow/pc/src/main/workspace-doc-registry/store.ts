import path from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

export const WORKSPACE_DOC_REGISTRY_PATH = '.moryflow/document-registry.json';
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

const getStorePath = (workspacePath: string): string =>
  path.join(workspacePath, WORKSPACE_DOC_REGISTRY_PATH);

export const loadWorkspaceDocRegistryStore = async (
  workspacePath: string
): Promise<WorkspaceDocumentRegistryStore> => {
  try {
    const raw = await readFile(getStorePath(workspacePath), 'utf8');
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
  entries: WorkspaceDocumentEntry[]
): Promise<void> => {
  const storePath = getStorePath(workspacePath);
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
};

export const clearWorkspaceDocRegistryStore = async (workspacePath: string): Promise<void> => {
  await rm(getStorePath(workspacePath), { force: true });
};
