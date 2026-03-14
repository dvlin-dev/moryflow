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
import type {
  MemoryServerExportData,
  MemoryServerFactHistory,
  MemoryServerGraphQueryResult,
  MemoryServerListFactsResult,
  MemoryServerOverview,
  MemoryServerSearchResult,
} from '../memory/api/client.js';

export class MemoryDesktopApiError extends Error {
  constructor(
    public readonly code:
      | 'UNAUTHORIZED'
      | 'WORKSPACE_UNAVAILABLE'
      | 'PROFILE_UNAVAILABLE',
    message: string
  ) {
    super(message);
    this.name = 'MemoryDesktopApiError';
  }
}

type MemoryIpcDeps = {
  profiles: {
    resolveActiveProfile: () => Promise<{
      loggedIn: boolean;
      activeVault: {
        id: string;
        name: string;
        path: string;
        addedAt: number;
      } | null;
      profile: {
        workspaceId: string;
        memoryProjectId: string;
        syncVaultId: string | null;
        syncEnabled: boolean;
        lastResolvedAt: string;
      } | null;
    }>;
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
  documentRegistry: {
    getByDocumentId: (
      vaultPath: string,
      documentId: string,
    ) => Promise<{ documentId: string; path: string; fingerprint: string } | null>;
  };
  api: {
    getOverview: (input: { workspaceId: string }) => Promise<MemoryServerOverview>;
    search: (input: MemorySearchInput & { workspaceId: string }) => Promise<MemoryServerSearchResult>;
    listFacts: (
      input: MemoryListFactsInput & { workspaceId: string }
    ) => Promise<MemoryServerListFactsResult>;
    getFactDetail: (input: { workspaceId: string; factId: string }) => Promise<MemoryFact>;
    createFact: (input: MemoryCreateFactInput & { workspaceId: string }) => Promise<MemoryFact>;
    updateFact: (input: MemoryUpdateFactInput & { workspaceId: string }) => Promise<MemoryFact>;
    deleteFact: (input: { workspaceId: string; factId: string }) => Promise<void>;
    batchUpdateFacts: (
      input: MemoryBatchUpdateFactsInput & { workspaceId: string }
    ) => Promise<{ updatedCount: number }>;
    batchDeleteFacts: (
      input: MemoryBatchDeleteFactsInput & { workspaceId: string }
    ) => Promise<{ deletedCount: number }>;
    getFactHistory: (input: { workspaceId: string; factId: string }) => Promise<MemoryServerFactHistory>;
    feedbackFact: (
      input: MemoryFeedbackInput & { workspaceId: string }
    ) => Promise<MemoryFeedbackResult>;
    queryGraph: (
      input: MemoryGraphQueryInput & { workspaceId: string }
    ) => Promise<MemoryServerGraphQueryResult>;
    getEntityDetail: (input: {
      workspaceId: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    }) => Promise<MemoryEntityDetail>;
    createExport: (input: { workspaceId: string }) => Promise<MemoryExportResult>;
    getExport: (input: { workspaceId: string; exportId: string }) => Promise<MemoryServerExportData>;
  };
};

type ResolvedMemoryContext = {
  loggedIn: boolean;
  activeVault: Awaited<
    ReturnType<MemoryIpcDeps['profiles']['resolveActiveProfile']>
  >['activeVault'];
  profile: Awaited<
    ReturnType<MemoryIpcDeps['profiles']['resolveActiveProfile']>
  >['profile'];
};

const emptyOverview = (
  context: ResolvedMemoryContext,
  deps: MemoryIpcDeps,
  disabledReason: 'login_required' | 'profile_unavailable' | 'workspace_unavailable'
): MemoryOverview => {
  const status = deps.engine.getStatus();
  return {
    scope: {
      workspaceId: context.profile?.workspaceId ?? context.activeVault?.id ?? null,
      workspaceName: context.activeVault?.name ?? null,
      localPath: context.activeVault?.path ?? null,
      vaultId: context.profile?.syncVaultId ?? null,
      projectId: context.profile?.memoryProjectId ?? null,
    },
    binding: {
      loggedIn: context.loggedIn,
      bound: Boolean(context.profile),
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
  const context = await deps.profiles.resolveActiveProfile();
  return {
    loggedIn: context.loggedIn,
    activeVault: context.activeVault,
    profile: context.profile,
  };
};

const requireWorkspaceContext = async (deps: MemoryIpcDeps) => {
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
  if (!context.profile?.workspaceId) {
    throw new MemoryDesktopApiError(
      'PROFILE_UNAVAILABLE',
      'Current workspace profile is not ready for Memory.'
    );
  }
  return {
    activeVault: context.activeVault,
    profile: context.profile,
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
  if (!context.profile) {
    return emptyOverview(context, deps, 'profile_unavailable');
  }

  const [overview, usage] = await Promise.all([
    deps.api.getOverview({ workspaceId: context.profile.workspaceId }),
    deps.usage.getUsage().catch(() => null),
  ]);
  const status = deps.engine.getStatus();

  return {
    scope: {
      workspaceId: context.profile.workspaceId,
      workspaceName: context.activeVault.name,
      localPath: context.activeVault.path,
      vaultId: context.profile.syncVaultId ?? overview.scope.syncVaultId,
      projectId: context.profile.memoryProjectId,
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
  const { activeVault, profile } = await requireWorkspaceContext(deps);
  const result = await deps.api.search({
    workspaceId: profile.workspaceId,
    query: input.query,
    limitPerGroup: input.limitPerGroup,
    includeGraphContext: input.includeGraphContext ?? false,
  });

  const fileItems = await Promise.all(
    result.groups.files.items.map(async (item) => {
      const registryEntry = await deps.documentRegistry.getByDocumentId(
        activeVault.path,
        item.documentId,
      );
      const relativePath = registryEntry?.path ?? item.path ?? null;
      const localPath = resolveLocalPath(activeVault.path, relativePath);
      return {
        id: item.id,
        fileId: item.documentId,
        vaultId: profile.syncVaultId,
        sourceId: item.sourceId,
        title: item.title,
        path: relativePath,
        localPath,
        disabled: !localPath,
        snippet: item.snippet,
        score: item.score,
      };
    }),
  );

  return {
    scope: {
      vaultId: profile.syncVaultId,
      projectId: profile.memoryProjectId,
    },
    query: result.query,
    groups: {
      files: {
        items: fileItems,
        returnedCount: result.groups.files.returnedCount,
        hasMore: result.groups.files.hasMore,
      },
      facts: result.groups.facts,
    },
  };
}

export async function listMemoryFactsIpc(
  deps: MemoryIpcDeps,
  input: MemoryListFactsInput
): Promise<MemoryListFactsResult> {
  const { profile } = await requireWorkspaceContext(deps);
  const result = await deps.api.listFacts({
    workspaceId: profile.workspaceId,
    ...input,
  });
  return {
    ...result,
    scope: {
      vaultId: profile.syncVaultId,
      projectId: profile.memoryProjectId,
    },
  };
}

export async function getMemoryFactDetailIpc(
  deps: MemoryIpcDeps,
  factId: string
): Promise<MemoryFact> {
  const { profile } = await requireWorkspaceContext(deps);
  return deps.api.getFactDetail({
    workspaceId: profile.workspaceId,
    factId,
  });
}

export async function createMemoryFactIpc(
  deps: MemoryIpcDeps,
  input: MemoryCreateFactInput
): Promise<MemoryFact> {
  const { profile } = await requireWorkspaceContext(deps);
  return deps.api.createFact({
    workspaceId: profile.workspaceId,
    ...input,
  });
}

export async function updateMemoryFactIpc(
  deps: MemoryIpcDeps,
  input: MemoryUpdateFactInput
): Promise<MemoryFact> {
  const { profile } = await requireWorkspaceContext(deps);
  return deps.api.updateFact({
    workspaceId: profile.workspaceId,
    ...input,
  });
}

export async function deleteMemoryFactIpc(deps: MemoryIpcDeps, factId: string): Promise<void> {
  const { profile } = await requireWorkspaceContext(deps);
  return deps.api.deleteFact({
    workspaceId: profile.workspaceId,
    factId,
  });
}

export async function batchUpdateMemoryFactsIpc(
  deps: MemoryIpcDeps,
  input: MemoryBatchUpdateFactsInput
): Promise<{ updatedCount: number }> {
  const { profile } = await requireWorkspaceContext(deps);
  return deps.api.batchUpdateFacts({
    workspaceId: profile.workspaceId,
    ...input,
  });
}

export async function batchDeleteMemoryFactsIpc(
  deps: MemoryIpcDeps,
  input: MemoryBatchDeleteFactsInput
): Promise<{ deletedCount: number }> {
  const { profile } = await requireWorkspaceContext(deps);
  return deps.api.batchDeleteFacts({
    workspaceId: profile.workspaceId,
    ...input,
  });
}

export async function getMemoryFactHistoryIpc(
  deps: MemoryIpcDeps,
  factId: string
): Promise<MemoryFactHistory> {
  const { profile } = await requireWorkspaceContext(deps);
  const result = await deps.api.getFactHistory({
    workspaceId: profile.workspaceId,
    factId,
  });
  return {
    ...result,
    scope: {
      vaultId: profile.syncVaultId,
      projectId: profile.memoryProjectId,
    },
  };
}

export async function feedbackMemoryFactIpc(
  deps: MemoryIpcDeps,
  input: MemoryFeedbackInput
): Promise<MemoryFeedbackResult> {
  const { profile } = await requireWorkspaceContext(deps);
  return deps.api.feedbackFact({
    workspaceId: profile.workspaceId,
    ...input,
  });
}

export async function queryMemoryGraphIpc(
  deps: MemoryIpcDeps,
  input: MemoryGraphQueryInput
): Promise<MemoryGraphQueryResult> {
  const { profile } = await requireWorkspaceContext(deps);
  const result = await deps.api.queryGraph({
    workspaceId: profile.workspaceId,
    ...input,
  });
  return {
    ...result,
    scope: {
      vaultId: profile.syncVaultId,
      projectId: profile.memoryProjectId,
    },
  };
}

export async function getMemoryEntityDetailIpc(
  deps: MemoryIpcDeps,
  input: MemoryEntityDetailInput
): Promise<MemoryEntityDetail> {
  const { profile } = await requireWorkspaceContext(deps);
  return deps.api.getEntityDetail({
    workspaceId: profile.workspaceId,
    entityId: input.entityId,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
}

export async function createMemoryExportIpc(deps: MemoryIpcDeps): Promise<MemoryExportResult> {
  const { profile } = await requireWorkspaceContext(deps);
  return deps.api.createExport({
    workspaceId: profile.workspaceId,
  });
}

export async function getMemoryExportIpc(
  deps: MemoryIpcDeps,
  exportId: string
): Promise<MemoryExportData> {
  const { profile } = await requireWorkspaceContext(deps);
  const result = await deps.api.getExport({
    workspaceId: profile.workspaceId,
    exportId,
  });
  return {
    ...result,
    scope: {
      vaultId: profile.syncVaultId,
      projectId: profile.memoryProjectId,
    },
  };
}
