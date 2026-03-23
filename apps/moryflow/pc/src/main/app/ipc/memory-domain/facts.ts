import type {
  MemoryBatchDeleteFactsInput,
  MemoryBatchUpdateFactsInput,
  MemoryCreateFactInput,
  MemoryEntityDetail,
  MemoryEntityDetailInput,
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
  MemorySearchInput,
  MemorySearchResult,
  MemoryUpdateFactInput,
} from '../../../../shared/ipc/memory.js';
import {
  enrichFact,
  enrichSearchFactItem,
  requireWorkspaceContext,
  resolveLocalPath,
  type MemoryIpcDeps,
} from './shared.js';

export async function searchMemoryIpc(
  deps: MemoryIpcDeps,
  input: MemorySearchInput
): Promise<MemorySearchResult> {
  const { activeVault, profile, profileKey } = await requireWorkspaceContext(deps);
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
        profileKey,
        profile.workspaceId,
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
