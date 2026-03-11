import path from 'node:path';
import type {
  MemoryCreateFactInput,
  MemoryEntityDetailInput,
  MemoryEntityDetail,
  MemoryExportData,
  MemoryExportResult,
  MemoryFact,
  MemoryFactHistory,
  MemoryFeedbackInput,
  MemoryFeedbackResult,
  MemoryGatewayOverview,
  MemoryGraphQueryInput,
  MemoryGraphQueryResult,
  MemoryListFactsInput,
  MemoryListFactsResult,
  MemoryOverview,
  MemorySearchInput,
  MemorySearchResult,
  MemoryUpdateFactInput,
  MemoryBatchUpdateFactsInput,
  MemoryBatchDeleteFactsInput,
} from '../../shared/ipc/memory.js';

export class MemoryDesktopApiError extends Error {
  constructor(
    public readonly code: 'UNAUTHORIZED' | 'WORKSPACE_UNAVAILABLE' | 'VAULT_NOT_BOUND',
    message: string
  ) {
    super(message);
    this.name = 'MemoryDesktopApiError';
  }
}

type MemoryIpcDeps = {
  membership: {
    getConfig: () => {
      token: string | null;
      apiUrl: string;
    };
  };
  vault: {
    getActiveVaultInfo: () => Promise<{
      id: string;
      name: string;
      path: string;
      addedAt: number;
    } | null>;
  };
  bindings: {
    readBinding: (localPath: string) => {
      localPath: string;
      vaultId: string;
      vaultName: string;
      boundAt: number;
      userId: string;
    } | null;
    readSettings: () => {
      syncEnabled: boolean;
      deviceId: string;
      deviceName: string;
    };
  };
  engine: {
    getStatus: () => {
      engineStatus: 'idle' | 'syncing' | 'offline' | 'disabled' | 'needs_recovery';
      vaultPath?: string | null;
      vaultId?: string | null;
      pendingCount: number;
      lastSyncAt: number | null;
      error?: string;
    };
  };
  usage: {
    getUsage: () => Promise<{
      storage: {
        used: number;
        limit: number;
        percentage: number;
      };
    }>;
  };
  fileIndex: {
    getByFileId: (vaultPath: string, fileId: string) => string | null | undefined;
  };
  api: {
    getOverview: (input: { vaultId: string }) => Promise<MemoryGatewayOverview>;
    search: (input: MemorySearchInput & { vaultId: string }) => Promise<MemorySearchResult>;
    listFacts: (
      input: MemoryListFactsInput & { vaultId: string }
    ) => Promise<MemoryListFactsResult>;
    getFactDetail: (input: { vaultId: string; factId: string }) => Promise<MemoryFact>;
    createFact: (input: MemoryCreateFactInput & { vaultId: string }) => Promise<MemoryFact>;
    updateFact: (input: MemoryUpdateFactInput & { vaultId: string }) => Promise<MemoryFact>;
    deleteFact: (input: { vaultId: string; factId: string }) => Promise<void>;
    batchUpdateFacts: (
      input: MemoryBatchUpdateFactsInput & { vaultId: string }
    ) => Promise<{ updatedCount: number }>;
    batchDeleteFacts: (
      input: MemoryBatchDeleteFactsInput & { vaultId: string }
    ) => Promise<{ deletedCount: number }>;
    getFactHistory: (input: { vaultId: string; factId: string }) => Promise<MemoryFactHistory>;
    feedbackFact: (
      input: MemoryFeedbackInput & { vaultId: string }
    ) => Promise<MemoryFeedbackResult>;
    queryGraph: (
      input: MemoryGraphQueryInput & { vaultId: string }
    ) => Promise<MemoryGraphQueryResult>;
    getEntityDetail: (input: {
      vaultId: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    }) => Promise<MemoryEntityDetail>;
    createExport: (input: { vaultId: string }) => Promise<MemoryExportResult>;
    getExport: (input: { vaultId: string; exportId: string }) => Promise<MemoryExportData>;
  };
};

type ResolvedMemoryContext = {
  loggedIn: boolean;
  activeVault: Awaited<ReturnType<MemoryIpcDeps['vault']['getActiveVaultInfo']>>;
  binding: ReturnType<MemoryIpcDeps['bindings']['readBinding']>;
};

const emptyOverview = (
  context: ResolvedMemoryContext,
  deps: MemoryIpcDeps,
  disabledReason: 'login_required' | 'vault_not_bound' | 'workspace_unavailable'
): MemoryOverview => {
  const status = deps.engine.getStatus();
  return {
    scope: {
      workspaceId: context.activeVault?.id ?? null,
      workspaceName: context.activeVault?.name ?? null,
      localPath: context.activeVault?.path ?? null,
      vaultId: context.binding?.vaultId ?? null,
      projectId: context.binding?.vaultId ?? null,
    },
    binding: {
      loggedIn: context.loggedIn,
      bound: false,
      disabledReason,
    },
    sync: {
      engineStatus: status.engineStatus,
      lastSyncAt: status.lastSyncAt ?? null,
      storageUsedBytes: 0,
    },
    indexing: {
      sourceCount: 0,
      indexedSourceCount: 0,
      pendingSourceCount: 0,
      failedSourceCount: 0,
      lastIndexedAt: null,
    },
    facts: {
      manualCount: 0,
      derivedCount: 0,
    },
    graph: {
      entityCount: 0,
      relationCount: 0,
      projectionStatus: 'idle',
      lastProjectedAt: null,
    },
  };
};

const resolveContext = async (deps: MemoryIpcDeps): Promise<ResolvedMemoryContext> => {
  const config = deps.membership.getConfig();
  const activeVault = await deps.vault.getActiveVaultInfo();
  const binding = activeVault ? deps.bindings.readBinding(activeVault.path) : null;
  return {
    loggedIn: Boolean(config.token),
    activeVault,
    binding,
  };
};

const requireBoundContext = async (deps: MemoryIpcDeps) => {
  const context = await resolveContext(deps);
  if (!context.loggedIn) {
    throw new MemoryDesktopApiError('UNAUTHORIZED', 'Please log in to access Memory.');
  }
  if (!context.activeVault?.path) {
    throw new MemoryDesktopApiError(
      'WORKSPACE_UNAVAILABLE',
      'No active workspace is available for Memory.'
    );
  }
  if (!context.binding?.vaultId) {
    throw new MemoryDesktopApiError(
      'VAULT_NOT_BOUND',
      'Current workspace is not bound to cloud memory.'
    );
  }
  return {
    activeVault: context.activeVault,
    binding: context.binding,
  };
};

const resolveLocalPath = (vaultPath: string, relativeOrAbsolute: string | null | undefined) => {
  if (!relativeOrAbsolute) return undefined;
  if (path.isAbsolute(relativeOrAbsolute)) return relativeOrAbsolute;
  return path.join(vaultPath, relativeOrAbsolute);
};

export async function getMemoryOverviewIpc(deps: MemoryIpcDeps): Promise<MemoryOverview> {
  const context = await resolveContext(deps);
  if (!context.activeVault) {
    return emptyOverview(context, deps, 'workspace_unavailable');
  }
  if (!context.loggedIn) {
    return emptyOverview(context, deps, 'login_required');
  }
  if (!context.binding) {
    return emptyOverview(context, deps, 'vault_not_bound');
  }

  const [overview, usage] = await Promise.all([
    deps.api.getOverview({ vaultId: context.binding.vaultId }),
    deps.usage.getUsage().catch(() => null),
  ]);
  const status = deps.engine.getStatus();

  return {
    scope: {
      workspaceId: context.activeVault.id,
      workspaceName: context.activeVault.name,
      localPath: context.activeVault.path,
      vaultId: context.binding.vaultId,
      projectId: overview.scope.projectId,
    },
    binding: {
      loggedIn: true,
      bound: true,
    },
    sync: {
      engineStatus: status.engineStatus,
      lastSyncAt: status.lastSyncAt ?? null,
      storageUsedBytes: usage?.storage.used ?? 0,
    },
    indexing: overview.indexing,
    facts: overview.facts,
    graph: overview.graph,
  };
}

export async function searchMemoryIpc(
  deps: MemoryIpcDeps,
  input: MemorySearchInput
): Promise<MemorySearchResult> {
  const { activeVault, binding } = await requireBoundContext(deps);
  const result = await deps.api.search({
    vaultId: binding.vaultId,
    query: input.query,
    limitPerGroup: input.limitPerGroup,
    includeGraphContext: input.includeGraphContext ?? false,
  });

  return {
    ...result,
    groups: {
      ...result.groups,
      files: {
        ...result.groups.files,
        items: result.groups.files.items.map((item) => {
          const relativePath = deps.fileIndex.getByFileId(activeVault.path, item.fileId) ?? null;
          const localPath = resolveLocalPath(activeVault.path, relativePath);
          return {
            ...item,
            localPath,
            disabled: !localPath,
          };
        }),
      },
    },
  };
}

export async function listMemoryFactsIpc(
  deps: MemoryIpcDeps,
  input: MemoryListFactsInput
): Promise<MemoryListFactsResult> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.listFacts({
    vaultId: binding.vaultId,
    ...input,
  });
}

export async function getMemoryFactDetailIpc(
  deps: MemoryIpcDeps,
  factId: string
): Promise<MemoryFact> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.getFactDetail({
    vaultId: binding.vaultId,
    factId,
  });
}

export async function createMemoryFactIpc(
  deps: MemoryIpcDeps,
  input: MemoryCreateFactInput
): Promise<MemoryFact> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.createFact({
    vaultId: binding.vaultId,
    ...input,
  });
}

export async function updateMemoryFactIpc(
  deps: MemoryIpcDeps,
  input: MemoryUpdateFactInput
): Promise<MemoryFact> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.updateFact({
    vaultId: binding.vaultId,
    ...input,
  });
}

export async function deleteMemoryFactIpc(deps: MemoryIpcDeps, factId: string): Promise<void> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.deleteFact({
    vaultId: binding.vaultId,
    factId,
  });
}

export async function batchUpdateMemoryFactsIpc(
  deps: MemoryIpcDeps,
  input: MemoryBatchUpdateFactsInput
): Promise<{ updatedCount: number }> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.batchUpdateFacts({
    vaultId: binding.vaultId,
    ...input,
  });
}

export async function batchDeleteMemoryFactsIpc(
  deps: MemoryIpcDeps,
  input: MemoryBatchDeleteFactsInput
): Promise<{ deletedCount: number }> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.batchDeleteFacts({
    vaultId: binding.vaultId,
    ...input,
  });
}

export async function getMemoryFactHistoryIpc(
  deps: MemoryIpcDeps,
  factId: string
): Promise<MemoryFactHistory> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.getFactHistory({
    vaultId: binding.vaultId,
    factId,
  });
}

export async function feedbackMemoryFactIpc(
  deps: MemoryIpcDeps,
  input: MemoryFeedbackInput
): Promise<MemoryFeedbackResult> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.feedbackFact({
    vaultId: binding.vaultId,
    ...input,
  });
}

export async function queryMemoryGraphIpc(
  deps: MemoryIpcDeps,
  input: MemoryGraphQueryInput
): Promise<MemoryGraphQueryResult> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.queryGraph({
    vaultId: binding.vaultId,
    ...input,
  });
}

export async function getMemoryEntityDetailIpc(
  deps: MemoryIpcDeps,
  input: MemoryEntityDetailInput
): Promise<MemoryEntityDetail> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.getEntityDetail({
    vaultId: binding.vaultId,
    entityId: input.entityId,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
}

export async function createMemoryExportIpc(deps: MemoryIpcDeps): Promise<MemoryExportResult> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.createExport({
    vaultId: binding.vaultId,
  });
}

export async function getMemoryExportIpc(
  deps: MemoryIpcDeps,
  exportId: string
): Promise<MemoryExportData> {
  const { binding } = await requireBoundContext(deps);
  return deps.api.getExport({
    vaultId: binding.vaultId,
    exportId,
  });
}
