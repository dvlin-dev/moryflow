/**
 * [PROVIDES]: publishFileIndexChanges - commit success 后发布 FileIndex 变更
 * [DEPENDS]: executor
 * [POS]: Mobile FileIndex 发布边界
 */

import { applyChangesToFileIndex, type ExecuteResult } from './executor';
import type { PendingChange, LocalFileState } from './file-collector';

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
