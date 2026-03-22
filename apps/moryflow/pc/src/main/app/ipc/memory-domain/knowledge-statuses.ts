import type {
  MemoryKnowledgeStatusesInput,
  MemoryKnowledgeStatusesResult,
} from '../../../../shared/ipc/memory.js';
import { requireWorkspaceContext, type MemoryIpcDeps } from './shared.js';

export async function getKnowledgeStatusesIpc(
  deps: MemoryIpcDeps,
  input: MemoryKnowledgeStatusesInput = {}
): Promise<MemoryKnowledgeStatusesResult> {
  const { profile } = await requireWorkspaceContext(deps);
  const result = await deps.api.getKnowledgeStatuses({
    workspaceId: profile.workspaceId,
    filter: input.filter,
  });

  return {
    scope: {
      vaultId: profile.syncVaultId ?? result.scope.syncVaultId,
      projectId: profile.memoryProjectId,
    },
    items: result.items,
  };
}
