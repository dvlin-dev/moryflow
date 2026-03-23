import path from 'node:path';
import type {
  MemoryBatchDeleteFactsInput,
  MemoryBatchUpdateFactsInput,
  MemoryCreateFactInput,
  MemoryEntityDetail,
  MemoryExportResult,
  MemoryFact,
  MemoryFactScope,
  MemoryFeedbackInput,
  MemoryFeedbackResult,
  MemoryGraphQueryInput,
  MemoryKnowledgeStatusesInput,
  MemoryListFactsInput,
  MemoryOverview,
  MemorySearchFactItem,
  MemorySearchInput,
  MemoryUpdateFactInput,
} from '../../../../shared/ipc/memory.js';
import type {
  MemoryServerExportData,
  MemoryServerFactHistory,
  MemoryServerGraphQueryResult,
  MemoryServerKnowledgeStatusesResult,
  MemoryServerListFactsResult,
  MemoryServerOverview,
  MemoryServerSearchResult,
  ServerMemoryFact,
  ServerMemorySearchFactItem,
} from '../../../memory/api/client.js';

export class MemoryDesktopApiError extends Error {
  constructor(
    public readonly code: 'UNAUTHORIZED' | 'WORKSPACE_UNAVAILABLE' | 'PROFILE_UNAVAILABLE',
    message: string
  ) {
    super(message);
    this.name = 'MemoryDesktopApiError';
  }
}

const computeFactScope = (kind: string): MemoryFactScope =>
  kind === 'manual' ? 'personal' : 'knowledge';

export const enrichFact = (raw: ServerMemoryFact): MemoryFact => ({
  ...raw,
  sourceType: null,
  factScope: computeFactScope(raw.kind),
});

export const enrichSearchFactItem = (raw: ServerMemorySearchFactItem): MemorySearchFactItem => ({
  ...raw,
  sourceType: null,
  factScope: computeFactScope(raw.kind),
});

export type MemoryIpcDeps = {
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
  memoryIndexing: {
    getBootstrapState: (vaultPath: string) => {
      pending: boolean;
      hasLocalDocuments: boolean;
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
    getAll: (
      vaultPath: string
    ) => Promise<
      Array<{
        documentId: string;
        path: string;
        fingerprint: string;
      }>
    >;
    getByDocumentId: (
      vaultPath: string,
      documentId: string
    ) => Promise<{ documentId: string; path: string; fingerprint: string } | null>;
    getByPath: (
      vaultPath: string,
      relativePath: string
    ) => Promise<{ documentId: string; path: string; fingerprint: string } | null>;
  };
  api: {
    getOverview: (input: { workspaceId: string }) => Promise<MemoryServerOverview>;
    getKnowledgeStatuses: (
      input: MemoryKnowledgeStatusesInput & { workspaceId: string }
    ) => Promise<MemoryServerKnowledgeStatusesResult>;
    search: (
      input: MemorySearchInput & { workspaceId: string }
    ) => Promise<MemoryServerSearchResult>;
    listFacts: (
      input: MemoryListFactsInput & { workspaceId: string }
    ) => Promise<MemoryServerListFactsResult>;
    getFactDetail: (input: { workspaceId: string; factId: string }) => Promise<ServerMemoryFact>;
    createFact: (
      input: MemoryCreateFactInput & { workspaceId: string }
    ) => Promise<ServerMemoryFact>;
    updateFact: (
      input: MemoryUpdateFactInput & { workspaceId: string }
    ) => Promise<ServerMemoryFact>;
    deleteFact: (input: { workspaceId: string; factId: string }) => Promise<void>;
    batchUpdateFacts: (
      input: MemoryBatchUpdateFactsInput & { workspaceId: string }
    ) => Promise<{ updatedCount: number }>;
    batchDeleteFacts: (
      input: MemoryBatchDeleteFactsInput & { workspaceId: string }
    ) => Promise<{ deletedCount: number }>;
    getFactHistory: (input: {
      workspaceId: string;
      factId: string;
    }) => Promise<MemoryServerFactHistory>;
    feedbackFact: (
      input: MemoryFeedbackInput & { workspaceId: string }
    ) => Promise<MemoryFeedbackResult>;
    queryGraph: (
      input: MemoryGraphQueryInput & { workspaceId: string }
    ) => Promise<MemoryServerGraphQueryResult>;
    getEntityDetail: (input: {
      workspaceId: string;
      entityId: string;
    }) => Promise<MemoryEntityDetail>;
    createExport: (input: { workspaceId: string }) => Promise<MemoryExportResult>;
    getExport: (input: {
      workspaceId: string;
      exportId: string;
    }) => Promise<MemoryServerExportData>;
  };
};

export type ResolvedMemoryContext = {
  loggedIn: boolean;
  activeVault: Awaited<
    ReturnType<MemoryIpcDeps['profiles']['resolveActiveProfile']>
  >['activeVault'];
  profile: Awaited<ReturnType<MemoryIpcDeps['profiles']['resolveActiveProfile']>>['profile'];
};

export const emptyOverview = (
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
    bootstrap: {
      pending: false,
      hasLocalDocuments: false,
    },
    projection: {
      pending: false,
      pendingUpsertCount: 0,
    },
    sync: {
      engineStatus: status.engineStatus,
      lastSyncAt: status.lastSyncAt ?? null,
      storageUsedBytes: 0,
    },
    indexing: {
      sourceCount: 0,
      indexedSourceCount: 0,
      indexingSourceCount: 0,
      attentionSourceCount: 0,
      lastIndexedAt: null,
    },
    facts: {
      manualCount: 0,
      derivedCount: 0,
    },
    graph: {
      entityCount: 0,
      relationCount: 0,
      projectionStatus: 'disabled',
      lastProjectedAt: null,
    },
  };
};

export const resolveContext = async (deps: MemoryIpcDeps): Promise<ResolvedMemoryContext> => {
  const context = await deps.profiles.resolveActiveProfile();
  return {
    loggedIn: context.loggedIn,
    activeVault: context.activeVault,
    profile: context.profile,
  };
};

export const requireWorkspaceContext = async (deps: MemoryIpcDeps) => {
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

export const resolveLocalPath = (
  vaultPath: string,
  relativeOrAbsolute: string | null | undefined
) => {
  if (!relativeOrAbsolute) return undefined;
  if (path.isAbsolute(relativeOrAbsolute)) return relativeOrAbsolute;
  return path.join(vaultPath, relativeOrAbsolute);
};
