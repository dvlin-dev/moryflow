/**
 * [PROVIDES]: apply journal persistence + staged apply replay
 * [DEPENDS]: executor types, expo-file-system
 * [POS]: Mobile 云同步本地 apply 事务日志
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Directory, File, Paths } from 'expo-file-system';
import { isSafeRelativeSyncPath, normalizeSyncPath } from '@moryflow/sync';
import type { ExecuteResult, StagedApplyOperation, UploadedObjectRef } from './executor';
import type { LocalFileState, PendingChange } from './file-collector';

export type ApplyJournalPhase = 'executing' | 'prepared' | 'committed';

export interface ApplyJournalRecord {
  journalId: string;
  createdAt: number;
  phase: ApplyJournalPhase;
  uploadedObjects: UploadedObjectRef[];
  stagedOperations: StagedApplyOperation[];
  executeResult: ExecuteResult;
  pendingChanges: PendingChange[];
  localStates: LocalFileState[];
}

const CLOUD_SYNC_DIR = '.moryflow/cloud-sync';
const APPLY_JOURNAL_FILE = `${CLOUD_SYNC_DIR}/apply-journal.json`;
const STAGING_ROOT = `${CLOUD_SYNC_DIR}/staging`;

const getJournalPath = (vaultPath: string): string => Paths.join(vaultPath, APPLY_JOURNAL_FILE);

export const getStagingDir = (vaultPath: string, journalId: string): string =>
  Paths.join(vaultPath, STAGING_ROOT, journalId);

const ensureParentDir = (filePath: string): void => {
  const dir = new Directory(Paths.dirname(filePath));
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
};

const writeJson = (filePath: string, value: unknown): void => {
  ensureParentDir(filePath);
  new File(filePath).write(JSON.stringify(value, null, 2));
};

export async function createApplyJournal(
  vaultPath: string,
  record: ApplyJournalRecord
): Promise<void> {
  const stagingDir = new Directory(getStagingDir(vaultPath, record.journalId));
  if (!stagingDir.exists) {
    stagingDir.create({ intermediates: true });
  }
  writeJson(getJournalPath(vaultPath), record);
}

export async function readApplyJournal(vaultPath: string): Promise<ApplyJournalRecord | null> {
  try {
    const file = new File(getJournalPath(vaultPath));
    if (!file.exists) {
      return null;
    }
    return JSON.parse(file.textSync()) as ApplyJournalRecord;
  } catch {
    return null;
  }
}

export async function updateApplyJournal(
  vaultPath: string,
  updater: (current: ApplyJournalRecord) => ApplyJournalRecord
): Promise<ApplyJournalRecord> {
  const current = await readApplyJournal(vaultPath);
  if (!current) {
    throw new Error('Apply journal is missing');
  }

  const next = updater(current);
  writeJson(getJournalPath(vaultPath), next);
  return next;
}

export async function clearApplyJournal(vaultPath: string): Promise<void> {
  const journal = await readApplyJournal(vaultPath);
  const journalFile = new File(getJournalPath(vaultPath));
  if (journalFile.exists) {
    journalFile.delete();
  }
  if (journal) {
    const stagingDir = new Directory(getStagingDir(vaultPath, journal.journalId));
    if (stagingDir.exists) {
      stagingDir.delete();
    }
  }
}

export async function createStagingFilePath(
  vaultPath: string,
  journalId: string,
  actionId: string,
  targetPath: string
): Promise<string> {
  const ext = Paths.extname(targetPath);
  const stagingPath = Paths.join(
    getStagingDir(vaultPath, journalId),
    `${actionId}${ext || '.tmp'}`
  );
  ensureParentDir(stagingPath);
  return stagingPath;
}

export async function applyStagedOperations(
  vaultPath: string,
  journal: ApplyJournalRecord
): Promise<void> {
  for (const operation of journal.stagedOperations) {
    switch (operation.type) {
      case 'write_file': {
        const targetPath = resolveVaultPath(vaultPath, operation.targetPath);
        const targetFile = new File(targetPath);
        const tempFile = new File(operation.tempFilePath);
        ensureParentDir(targetPath);

        if (!tempFile.exists) {
          if (targetFile.exists) {
            break;
          }
          throw new Error(`Missing staged file: ${operation.tempFilePath}`);
        }

        if (operation.replacePath && operation.replacePath !== operation.targetPath) {
          const replaceFile = new File(resolveVaultPath(vaultPath, operation.replacePath));
          if (replaceFile.exists) {
            replaceFile.delete();
          }
        }

        if (targetFile.exists) {
          targetFile.delete();
        }
        tempFile.move(targetFile);
        break;
      }

      case 'rename_file': {
        const sourceFile = new File(resolveVaultPath(vaultPath, operation.sourcePath));
        const targetPath = resolveVaultPath(vaultPath, operation.targetPath);
        const targetFile = new File(targetPath);
        ensureParentDir(targetPath);

        if (!sourceFile.exists) {
          if (targetFile.exists) {
            break;
          }
          throw new Error(`Missing source file for rename: ${operation.sourcePath}`);
        }

        if (targetFile.exists) {
          targetFile.delete();
        }
        sourceFile.move(targetFile);
        break;
      }

      case 'delete_file': {
        const targetFile = new File(resolveVaultPath(vaultPath, operation.targetPath));
        if (targetFile.exists) {
          targetFile.delete();
        }
        break;
      }
    }
  }
}

const resolveVaultPath = (vaultPath: string, relativePath: string): string => {
  const normalized = normalizeSyncPath(relativePath);
  if (!isSafeRelativeSyncPath(normalized)) {
    throw new Error(`Refusing to access path outside vault: ${relativePath}`);
  }
  return Paths.join(vaultPath, normalized);
};
