/**
 * [PROVIDES]: apply journal persistence + staged apply replay
 * [DEPENDS]: sync-engine/executor types
 * [POS]: PC 云同步本地 apply 事务日志
 */

import path from 'node:path';
import { access, mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import type {
  ExecuteResult,
  LocalFileState,
  PendingChange,
  StagedApplyOperation,
  UploadedObjectRef,
} from './sync-engine/executor.js';
import { getCloudSyncProfileDir, getCloudSyncProfileStatePath } from './profile-storage.js';

export type ApplyJournalPhase = 'executing' | 'prepared' | 'committed';

export interface ApplyJournalRecord {
  journalId: string;
  createdAt: number;
  phase: ApplyJournalPhase;
  vaultId?: string;
  userId?: string;
  workspaceId?: string;
  uploadedObjects: UploadedObjectRef[];
  stagedOperations: StagedApplyOperation[];
  executeResult: ExecuteResult;
  pendingChanges: PendingChange[];
  localStates: LocalFileState[];
}

const APPLY_JOURNAL_FILE = 'apply-journal.json';
const STAGING_ROOT = 'staging';

const getJournalPath = (vaultPath: string, profileKey: string): string =>
  getCloudSyncProfileStatePath(vaultPath, profileKey, APPLY_JOURNAL_FILE);

export const getStagingDir = (
  vaultPath: string,
  profileKey: string,
  journalId: string
): string => path.join(getCloudSyncProfileDir(vaultPath, profileKey), STAGING_ROOT, journalId);

const ensureParentDir = async (filePath: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
};

export const createApplyJournal = async (
  vaultPath: string,
  profileKey: string,
  record: ApplyJournalRecord
): Promise<void> => {
  const journalPath = getJournalPath(vaultPath, profileKey);
  await ensureParentDir(journalPath);
  await mkdir(getStagingDir(vaultPath, profileKey, record.journalId), { recursive: true });
  await writeFile(journalPath, JSON.stringify(record, null, 2), 'utf8');
};

export const readApplyJournal = async (
  vaultPath: string,
  profileKey: string
): Promise<ApplyJournalRecord | null> => {
  try {
    const content = await readFile(getJournalPath(vaultPath, profileKey), 'utf8');
    return JSON.parse(content) as ApplyJournalRecord;
  } catch {
    return null;
  }
};

export const updateApplyJournal = async (
  vaultPath: string,
  profileKey: string,
  updater: (current: ApplyJournalRecord) => ApplyJournalRecord
): Promise<ApplyJournalRecord> => {
  const current = await readApplyJournal(vaultPath, profileKey);
  if (!current) {
    throw new Error('Apply journal is missing');
  }

  const next = updater(current);
  await writeFile(getJournalPath(vaultPath, profileKey), JSON.stringify(next, null, 2), 'utf8');
  return next;
};

export const clearApplyJournal = async (vaultPath: string, profileKey: string): Promise<void> => {
  const journal = await readApplyJournal(vaultPath, profileKey);
  await rm(getJournalPath(vaultPath, profileKey), { force: true });
  if (journal) {
    await rm(getStagingDir(vaultPath, profileKey, journal.journalId), {
      recursive: true,
      force: true,
    });
  }
};

export const createStagingFilePath = async (
  vaultPath: string,
  profileKey: string,
  journalId: string,
  actionId: string,
  targetPath: string
): Promise<string> => {
  const ext = path.extname(targetPath);
  const stagingFilePath = path.join(
    getStagingDir(vaultPath, profileKey, journalId),
    `${actionId}${ext || '.bin'}`
  );
  await ensureParentDir(stagingFilePath);
  return stagingFilePath;
};

export const applyStagedOperations = async (
  vaultPath: string,
  journal: ApplyJournalRecord
): Promise<void> => {
  for (const operation of journal.stagedOperations) {
    switch (operation.type) {
      case 'write_file': {
        const targetPath = resolveVaultPath(vaultPath, operation.targetPath);
        await ensureParentDir(targetPath);

        const tempExists = await pathExists(operation.tempFilePath);
        if (!tempExists) {
          if (await pathExists(targetPath)) {
            break;
          }
          throw new Error(`Missing staged file: ${operation.tempFilePath}`);
        }

        if (operation.replacePath && operation.replacePath !== operation.targetPath) {
          const replacePath = resolveVaultPath(vaultPath, operation.replacePath);
          await rm(replacePath, { force: true });
        }

        await rm(targetPath, { force: true });
        await rename(operation.tempFilePath, targetPath);
        break;
      }

      case 'rename_file': {
        const sourcePath = resolveVaultPath(vaultPath, operation.sourcePath);
        const targetPath = resolveVaultPath(vaultPath, operation.targetPath);
        await ensureParentDir(targetPath);
        const sourceExists = await pathExists(sourcePath);
        if (!sourceExists) {
          if (await pathExists(targetPath)) {
            break;
          }
          throw new Error(`Missing source file for rename: ${operation.sourcePath}`);
        }
        await rm(targetPath, { force: true });
        await rename(sourcePath, targetPath);
        break;
      }

      case 'delete_file': {
        const targetPath = resolveVaultPath(vaultPath, operation.targetPath);
        await unlink(targetPath).catch(() => undefined);
        break;
      }
    }
  }
};

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveVaultPath = (vaultPath: string, relativePath: string): string => {
  const root = path.resolve(vaultPath);
  const target = path.resolve(root, relativePath);
  if (target === root || !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to access path outside vault: ${relativePath}`);
  }
  return target;
};
