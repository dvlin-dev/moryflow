/**
 * [PROVIDES]: recoverPendingApply - replay/cleanup cloud-sync apply journal
 * [DEPENDS]: apply-journal, file-index-publisher, api/client
 * [POS]: PC 云同步恢复协调器
 */

import {
  applyStagedOperations,
  clearApplyJournal,
  readApplyJournal,
  type ApplyJournalRecord,
} from './apply-journal.js';
import { publishFileIndexChanges } from './file-index-publisher.js';
import { cloudSyncApi } from './api/client.js';
import type { LocalFileState, PendingChange } from './sync-engine/executor.js';
import { workspaceDocRegistry } from '../workspace-doc-registry/index.js';

const toPendingChangeMap = (
  pendingChanges: ApplyJournalRecord['pendingChanges']
): Map<string, PendingChange> => new Map(pendingChanges.map((change) => [change.fileId, change]));

const toLocalStateMap = (
  localStates: ApplyJournalRecord['localStates']
): Map<string, LocalFileState> => new Map(localStates.map((state) => [state.fileId, state]));

export interface RecoverPendingApplyParams {
  vaultPath: string;
  profileKey: string;
  workspaceId: string;
  vaultId: string;
  currentUserId?: string;
}

export async function recoverPendingApply({
  vaultPath,
  profileKey,
  workspaceId,
  vaultId,
  currentUserId,
}: RecoverPendingApplyParams): Promise<boolean> {
  const journal = await readApplyJournal(vaultPath, profileKey);
  if (!journal) {
    return false;
  }

  const vaultMismatch = Boolean(journal.vaultId && journal.vaultId !== vaultId);
  const userMismatch = Boolean(journal.userId && currentUserId && journal.userId !== currentUserId);
  const workspaceMismatch = Boolean(journal.workspaceId && journal.workspaceId !== workspaceId);

  if (vaultMismatch || userMismatch || workspaceMismatch) {
    if (
      (journal.phase === 'executing' || journal.phase === 'prepared') &&
      journal.uploadedObjects.length > 0 &&
      journal.vaultId
    ) {
      await cloudSyncApi
        .cleanupOrphans({
          vaultId: journal.vaultId,
          objects: journal.uploadedObjects,
        })
        .catch(() => undefined);
    }
    await clearApplyJournal(vaultPath, profileKey);
    return true;
  }

  if (journal.phase === 'committed') {
    await applyStagedOperations(vaultPath, journal);
    await workspaceDocRegistry.sync(vaultPath, profileKey, workspaceId);
    await publishFileIndexChanges(
      vaultPath,
      profileKey,
      workspaceId,
      toPendingChangeMap(journal.pendingChanges),
      journal.executeResult,
      new Set(journal.executeResult.completedFileIds),
      toLocalStateMap(journal.localStates)
    );
  }

  if (
    (journal.phase === 'executing' || journal.phase === 'prepared') &&
    journal.uploadedObjects.length > 0
  ) {
    await cloudSyncApi.cleanupOrphans({
      vaultId,
      objects: journal.uploadedObjects,
    });
  }

  await clearApplyJournal(vaultPath, profileKey);
  return true;
}
