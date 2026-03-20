import path from 'node:path';
import { stat, readFile, realpath } from 'node:fs/promises';
import type {
  MemoryCreateFactInput,
  MemoryEntityDetailInput,
  MemoryEntityDetail,
  MemoryExportData,
  MemoryExportResult,
  MemoryFact,
  MemoryFactHistory,
  MemoryFactScope,
  MemoryFeedbackInput,
  MemoryFeedbackResult,
  MemoryGraphQueryInput,
  MemoryGraphQueryResult,
  MemoryListFactsInput,
  MemoryListFactsResult,
  MemoryOverview,
  MemorySearchInput,
  MemorySearchResult,
  MemorySearchFactItem,
  MemoryUpdateFactInput,
  MemoryBatchUpdateFactsInput,
  MemoryBatchDeleteFactsInput,
  KnowledgeReadInput,
  KnowledgeReadOutput,
} from '../../shared/ipc/memory.js';
import type {
  ServerMemoryFact,
  ServerMemorySearchFactItem,
  MemoryServerExportData,
  MemoryServerFactHistory,
  MemoryServerGraphQueryResult,
  MemoryServerListFactsResult,
  MemoryServerOverview,
  MemoryServerSearchResult,
} from '../memory/api/client.js';

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

const enrichFact = (raw: ServerMemoryFact): MemoryFact => ({
  ...raw,
  sourceType: null,
  factScope: computeFactScope(raw.kind),
});

const enrichSearchFactItem = (raw: ServerMemorySearchFactItem): MemorySearchFactItem => ({
  ...raw,
  sourceType: null,
  factScope: computeFactScope(raw.kind),
});

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
      documentId: string
    ) => Promise<{ documentId: string; path: string; fingerprint: string } | null>;
    getByPath: (
      vaultPath: string,
      relativePath: string
    ) => Promise<{ documentId: string; path: string; fingerprint: string } | null>;
  };
  api: {
    getOverview: (input: { workspaceId: string }) => Promise<MemoryServerOverview>;
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

type ResolvedMemoryContext = {
  loggedIn: boolean;
  activeVault: Awaited<
    ReturnType<MemoryIpcDeps['profiles']['resolveActiveProfile']>
  >['activeVault'];
  profile: Awaited<ReturnType<MemoryIpcDeps['profiles']['resolveActiveProfile']>>['profile'];
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
      projectionStatus: 'disabled',
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
        item.documentId
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
    })
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
      facts: {
        items: result.groups.facts.items.map(enrichSearchFactItem),
        returnedCount: result.groups.facts.returnedCount,
        hasMore: result.groups.facts.hasMore,
      },
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
    scope: {
      vaultId: profile.syncVaultId,
      projectId: profile.memoryProjectId,
    },
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.hasMore,
    items: result.items.map(enrichFact),
  };
}

export async function getMemoryFactDetailIpc(
  deps: MemoryIpcDeps,
  factId: string
): Promise<MemoryFact> {
  const { profile } = await requireWorkspaceContext(deps);
  const raw = await deps.api.getFactDetail({
    workspaceId: profile.workspaceId,
    factId,
  });
  return enrichFact(raw);
}

export async function createMemoryFactIpc(
  deps: MemoryIpcDeps,
  input: MemoryCreateFactInput
): Promise<MemoryFact> {
  const { profile } = await requireWorkspaceContext(deps);
  const raw = await deps.api.createFact({
    workspaceId: profile.workspaceId,
    ...input,
  });
  return enrichFact(raw);
}

export async function updateMemoryFactIpc(
  deps: MemoryIpcDeps,
  input: MemoryUpdateFactInput
): Promise<MemoryFact> {
  const { profile } = await requireWorkspaceContext(deps);
  const raw = await deps.api.updateFact({
    workspaceId: profile.workspaceId,
    ...input,
  });
  return enrichFact(raw);
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
    scope: {
      vaultId: profile.syncVaultId,
      projectId: profile.memoryProjectId,
    },
    items: result.items.map(enrichFact),
  };
}

const KNOWLEDGE_READ_MAX_CHARS = 50_000;
const KNOWLEDGE_READ_DEFAULT_MAX_CHARS = 20_000;
const KNOWLEDGE_READ_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const sliceByCodePoints = (
  content: string,
  offsetChars: number,
  maxChars: number
): {
  content: string;
  endOffset: number;
  truncated: boolean;
} => {
  const codePoints = Array.from(content);
  const safeOffset = Math.max(0, offsetChars);
  const safeLimit = Math.max(0, maxChars);
  const slice = codePoints.slice(safeOffset, safeOffset + safeLimit).join('');
  const endOffset = safeOffset + Array.from(slice).length;
  return {
    content: slice,
    endOffset,
    truncated: endOffset < codePoints.length,
  };
};

export async function readWorkspaceFileIpc(
  deps: MemoryIpcDeps,
  input: KnowledgeReadInput
): Promise<KnowledgeReadOutput> {
  const { activeVault } = await requireWorkspaceContext(deps);
  const vaultPath = activeVault.path;

  // Resolve documentId from registry
  let entry: { documentId: string; path: string; fingerprint: string } | null = null;

  if (input.documentId) {
    entry = await deps.documentRegistry.getByDocumentId(vaultPath, input.documentId);
    // Fail closed: if documentId was explicitly provided but not found,
    // do NOT fall back to path (could silently read a different file after rename/recreate)
    if (!entry) {
      throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Document not found in workspace.');
    }
  } else if (input.path) {
    // Path-only fallback: only when documentId is not provided at all
    if (path.isAbsolute(input.path)) {
      throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Absolute paths are not accepted.');
    }
    entry = await deps.documentRegistry.getByPath(vaultPath, input.path);
  }

  if (!entry) {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Document not found in workspace.');
  }

  // Resolve and validate path within vault (lexical + symlink check)
  const resolved = path.resolve(path.join(vaultPath, entry.path));
  if (!resolved.startsWith(vaultPath + path.sep) && resolved !== vaultPath) {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Path is outside workspace boundary.');
  }
  // Follow symlinks and verify real path is still within vault
  let realResolved: string;
  try {
    realResolved = await realpath(resolved);
  } catch {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'File not found.');
  }
  const realVaultPath = await realpath(vaultPath);
  if (!realResolved.startsWith(realVaultPath + path.sep) && realResolved !== realVaultPath) {
    throw new MemoryDesktopApiError(
      'WORKSPACE_UNAVAILABLE',
      'File target is outside workspace boundary.'
    );
  }

  // Mime type check first (by extension + basename), so large-file response has correct mimeType
  const ext = path.extname(realResolved).toLowerCase();
  const basename = path.basename(realResolved).toLowerCase();
  const TEXT_EXT_MAP: Record<string, string> = {
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.mdx': 'text/markdown',
    '.txt': 'text/plain',
    '.log': 'text/plain',
    '.env': 'text/plain',
    '.json': 'application/json',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.toml': 'text/plain',
    '.csv': 'text/csv',
    '.xml': 'text/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.vue': 'text/plain',
    '.svelte': 'text/plain',
    '.astro': 'text/plain',
    '.py': 'text/x-python',
    '.rb': 'text/x-ruby',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust',
    '.java': 'text/x-java',
    '.c': 'text/x-c',
    '.cpp': 'text/x-c++',
    '.h': 'text/x-c',
    '.sh': 'text/x-shellscript',
    '.bat': 'text/plain',
    '.ps1': 'text/plain',
    '.sql': 'text/x-sql',
    '.r': 'text/plain',
    '.m': 'text/plain',
    '.swift': 'text/x-swift',
    '.kt': 'text/x-kotlin',
    '.scala': 'text/x-scala',
    '.lua': 'text/x-lua',
    '.pl': 'text/x-perl',
    '.ex': 'text/x-elixir',
    '.exs': 'text/x-elixir',
    '.erl': 'text/x-erlang',
    '.hs': 'text/x-haskell',
    '.clj': 'text/x-clojure',
    '.lisp': 'text/x-lisp',
    '.ini': 'text/plain',
    '.cfg': 'text/plain',
    '.conf': 'text/plain',
    '.rst': 'text/x-rst',
    '.tex': 'text/x-tex',
  };
  // Extensionless text files identified by basename
  const TEXT_BASENAME_MAP: Record<string, string> = {
    dockerfile: 'text/plain',
    makefile: 'text/plain',
    gemfile: 'text/plain',
    rakefile: 'text/plain',
    procfile: 'text/plain',
    '.gitignore': 'text/plain',
    '.dockerignore': 'text/plain',
    '.editorconfig': 'text/plain',
    '.eslintrc': 'text/plain',
    '.prettierrc': 'text/plain',
  };
  const mimeType = TEXT_EXT_MAP[ext] ?? TEXT_BASENAME_MAP[basename];
  if (!mimeType) {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Only text files can be read.');
  }

  // File size check (use realResolved for consistency after symlink resolution)
  let fileStat;
  try {
    fileStat = await stat(realResolved);
  } catch {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'File not found.');
  }

  if (fileStat.size > KNOWLEDGE_READ_MAX_FILE_BYTES) {
    return {
      content: '',
      truncated: true,
      nextOffset: null,
      mimeType,
      totalBytes: fileStat.size,
      relativePath: entry.path,
    };
  }

  // Read file content (use realResolved for consistency)
  const fullContent = await readFile(realResolved, 'utf8');
  const offsetChars = input.offsetChars ?? 0;
  const maxChars = Math.min(
    input.maxChars ?? KNOWLEDGE_READ_DEFAULT_MAX_CHARS,
    KNOWLEDGE_READ_MAX_CHARS
  );
  const { content, endOffset, truncated } = sliceByCodePoints(fullContent, offsetChars, maxChars);

  return {
    content,
    truncated,
    nextOffset: truncated ? endOffset : null,
    mimeType,
    totalBytes: fileStat.size,
    relativePath: entry.path,
  };
}
