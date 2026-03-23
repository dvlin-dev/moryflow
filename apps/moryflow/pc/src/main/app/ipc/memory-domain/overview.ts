import type { MemoryOverview } from '../../../../shared/ipc/memory.js';
import {
  emptyOverview,
  emptyProjectionOverview,
  resolveContext,
  type MemoryIpcDeps,
} from './shared.js';

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
  const bootstrap = deps.memoryIndexing.getBootstrapState(context.activeVault.path);

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
    bootstrap: {
      pending: bootstrap.pending,
      hasLocalDocuments: bootstrap.hasLocalDocuments,
    },
    projection: overview.projection ?? emptyProjectionOverview(),
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
