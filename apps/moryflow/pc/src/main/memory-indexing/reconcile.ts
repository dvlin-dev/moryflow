import path from 'node:path';
import type { WorkspaceDocumentEntry } from '../workspace-doc-registry/store.js';
import { scanWorkspaceDocuments as defaultScanWorkspaceDocuments } from '../workspace-doc-registry/scanner.js';

type DocumentRegistryDeps = {
  getAll: (workspacePath: string) => Promise<WorkspaceDocumentEntry[]>;
  sync: (
    workspacePath: string,
    options?: {
      retainMissingDocumentIds?: Set<string>;
    }
  ) => Promise<WorkspaceDocumentEntry[]>;
};

type MemoryIndexingEngineDeps = {
  handleFileChange: (type: 'add' | 'change' | 'unlink', absolutePath: string) => void;
  getPendingPaths: () => string[];
  clearPendingPathsForVault: (vaultPrefix: string) => void;
  markBootstrapStarted: (vaultPath: string) => symbol;
  markBootstrapDocuments: (vaultPath: string, token: symbol, hasLocalDocuments: boolean) => void;
  markBootstrapFinished: (vaultPath: string, token: symbol) => void;
};

export async function reconcileMemoryIndexingVault(params: {
  vaultPath: string;
  documentRegistry: DocumentRegistryDeps;
  memoryIndexingEngine: MemoryIndexingEngineDeps;
  scanWorkspaceDocuments?: typeof defaultScanWorkspaceDocuments;
  forceReplayAll?: boolean;
}): Promise<void> {
  const {
    vaultPath,
    documentRegistry,
    memoryIndexingEngine,
    scanWorkspaceDocuments = defaultScanWorkspaceDocuments,
    forceReplayAll = false,
  } = params;

  const bootstrapToken = memoryIndexingEngine.markBootstrapStarted(vaultPath);
  try {
    const entriesBefore = await documentRegistry.getAll(vaultPath);
    const pathsBefore = new Set(entriesBefore.map((entry) => entry.path));
    const entriesBeforeByPath = new Map(entriesBefore.map((entry) => [entry.path, entry] as const));

    const filesOnDisk = await scanWorkspaceDocuments(vaultPath);
    memoryIndexingEngine.markBootstrapDocuments(vaultPath, bootstrapToken, filesOnDisk.length > 0);
    const diskPaths = new Set(filesOnDisk.map((file) => file.path));
    const deletedDocumentIds = new Set(
      entriesBefore.filter((entry) => !diskPaths.has(entry.path)).map((entry) => entry.documentId)
    );

    const entriesAfter = await documentRegistry.sync(vaultPath, {
      retainMissingDocumentIds: deletedDocumentIds,
    });

    for (const entry of entriesAfter) {
      if (!pathsBefore.has(entry.path) && !deletedDocumentIds.has(entry.documentId)) {
        memoryIndexingEngine.handleFileChange('add', path.join(vaultPath, entry.path));
      }
    }

    for (const entry of entriesBefore) {
      if (!diskPaths.has(entry.path)) {
        memoryIndexingEngine.handleFileChange('unlink', path.join(vaultPath, entry.path));
      }
    }

    for (const entry of entriesAfter) {
      // Only fire change for files that still exist on disk (exclude retained deleted entries)
      if (!diskPaths.has(entry.path)) continue;
      const previousEntry = entriesBeforeByPath.get(entry.path);
      if (
        forceReplayAll ||
        (previousEntry && previousEntry.contentFingerprint !== entry.contentFingerprint)
      ) {
        memoryIndexingEngine.handleFileChange('change', path.join(vaultPath, entry.path));
      }
    }

    const vaultPrefix = vaultPath + path.sep;
    for (const pendingPath of memoryIndexingEngine.getPendingPaths()) {
      if (pendingPath.startsWith(vaultPrefix) || pendingPath === vaultPath) {
        memoryIndexingEngine.handleFileChange('change', pendingPath);
      }
    }
    memoryIndexingEngine.clearPendingPathsForVault(vaultPrefix);
  } finally {
    memoryIndexingEngine.markBootstrapFinished(vaultPath, bootstrapToken);
  }
}
