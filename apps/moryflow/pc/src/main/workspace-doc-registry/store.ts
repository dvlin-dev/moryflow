import path from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

export const WORKSPACE_DOC_REGISTRY_PATH = '.moryflow/document-registry.json';
const CURRENT_VERSION = 1;

export interface WorkspaceDocumentEntry {
  documentId: string;
  path: string;
  fingerprint: string;
}

export interface WorkspaceDocumentRegistryStore {
  version: number;
  entries: WorkspaceDocumentEntry[];
}

const createEmptyStore = (): WorkspaceDocumentRegistryStore => ({
  version: CURRENT_VERSION,
  entries: [],
});

const getStorePath = (workspacePath: string): string =>
  path.join(workspacePath, WORKSPACE_DOC_REGISTRY_PATH);

export const loadWorkspaceDocRegistryStore = async (
  workspacePath: string,
): Promise<WorkspaceDocumentRegistryStore> => {
  try {
    const raw = await readFile(getStorePath(workspacePath), 'utf8');
    const parsed = JSON.parse(raw) as WorkspaceDocumentRegistryStore;
    if (
      !parsed ||
      parsed.version !== CURRENT_VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return createEmptyStore();
    }
    return parsed;
  } catch {
    return createEmptyStore();
  }
};

export const saveWorkspaceDocRegistryStore = async (
  workspacePath: string,
  entries: WorkspaceDocumentEntry[],
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
      2,
    ),
  );
};

export const clearWorkspaceDocRegistryStore = async (
  workspacePath: string,
): Promise<void> => {
  await rm(getStorePath(workspacePath), { force: true });
};
