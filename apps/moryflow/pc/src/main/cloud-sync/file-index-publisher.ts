/**
 * [PROVIDES]: publishFileIndexChanges - commit success 后发布 profile 级 sync mirror 变更
 * [DEPENDS]: sync-engine/executor
 * [POS]: PC Sync Mirror 发布边界
 */

import {
  applyChangesToSyncMirror,
  type ExecuteResult,
  type LocalFileState,
  type PendingChange,
} from './sync-engine/executor.js';

export async function publishFileIndexChanges(
  vaultPath: string,
  profileKey: string,
  pendingChanges: Map<string, PendingChange>,
  executeResult: ExecuteResult,
  completedIds: Set<string>,
  localStates: Map<string, LocalFileState>
): Promise<void> {
  await applyChangesToSyncMirror(
    vaultPath,
    profileKey,
    pendingChanges,
    executeResult,
    completedIds,
    localStates
  );
}
