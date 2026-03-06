/**
 * [PROVIDES]: publishFileIndexChanges - commit success 后发布 FileIndex 变更
 * [DEPENDS]: sync-engine/executor
 * [POS]: PC FileIndex 发布边界
 */

import {
  applyChangesToFileIndex,
  type ExecuteResult,
  type LocalFileState,
  type PendingChange,
} from './sync-engine/executor.js';

export async function publishFileIndexChanges(
  vaultPath: string,
  pendingChanges: Map<string, PendingChange>,
  executeResult: ExecuteResult,
  completedIds: Set<string>,
  localStates: Map<string, LocalFileState>
): Promise<void> {
  await applyChangesToFileIndex(
    vaultPath,
    pendingChanges,
    executeResult,
    completedIds,
    localStates
  );
}
