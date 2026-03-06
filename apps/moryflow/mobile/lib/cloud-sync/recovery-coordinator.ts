/**
 * [PROVIDES]: recoverPendingApply - replay/cleanup cloud-sync apply journal
 * [DEPENDS]: apply-journal, file-index-publisher, api-client
 * [POS]: Mobile 云同步恢复协调器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  applyStagedOperations,
  clearApplyJournal,
  readApplyJournal,
  type ApplyJournalRecord,
} from './apply-journal';
import { publishFileIndexChanges } from './file-index-publisher';
import { cloudSyncApi } from './api-client';
import type { LocalFileState, PendingChange } from './file-collector';

const toPendingChangeMap = (
  pendingChanges: ApplyJournalRecord['pendingChanges']
): Map<string, PendingChange> => new Map(pendingChanges.map((change) => [change.fileId, change]));

const toLocalStateMap = (
  localStates: ApplyJournalRecord['localStates']
): Map<string, LocalFileState> => new Map(localStates.map((state) => [state.fileId, state]));

export interface RecoverPendingApplyParams {
  vaultPath: string;
  vaultId: string;
}

export async function recoverPendingApply({
  vaultPath,
  vaultId,
}: RecoverPendingApplyParams): Promise<boolean> {
  const journal = await readApplyJournal(vaultPath);
  if (!journal) {
    return false;
  }

  if (journal.phase === 'committed') {
    await applyStagedOperations(vaultPath, journal);
    await publishFileIndexChanges(
      vaultPath,
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

  await clearApplyJournal(vaultPath);
  return true;
}
