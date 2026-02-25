/**
 * [INPUT]: localFiles, remoteFiles, deviceName
 * [OUTPUT]: SyncActionDto[]
 * [POS]: 云同步差异计算（纯函数模块）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { randomUUID } from 'node:crypto';
import {
  compareVectorClocks,
  type VectorClock,
  type ClockRelation,
} from '@moryflow/sync';
import type { LocalFileDto, SyncActionDto } from './dto';

export interface RemoteFile {
  id: string;
  path: string;
  title: string;
  size: number;
  contentHash: string;
  vectorClock: VectorClock;
  isDeleted: boolean;
}

export function computeSyncActions(
  localFiles: LocalFileDto[],
  remoteFiles: RemoteFile[],
  deviceName: string,
): SyncActionDto[] {
  const actions: SyncActionDto[] = [];
  const localMap = new Map(localFiles.map((f) => [f.fileId, f]));
  const remoteMap = new Map(remoteFiles.map((f) => [f.id, f]));

  for (const local of localFiles) {
    const remote = remoteMap.get(local.fileId);
    const action = resolveFile(local, remote, deviceName);
    if (action) actions.push(action);
  }

  for (const remote of remoteFiles) {
    if (!localMap.has(remote.id) && !remote.isDeleted) {
      actions.push(createDownloadAction(remote));
    }
  }

  return actions;
}

function resolveFile(
  local: LocalFileDto,
  remote: RemoteFile | undefined,
  deviceName: string,
): SyncActionDto | null {
  const isLocalDeleted = local.contentHash === '';

  if (!remote) {
    return isLocalDeleted ? null : createUploadAction(local);
  }

  const isRemoteDeleted = remote.isDeleted;
  const relation = compareVectorClocks(local.vectorClock, remote.vectorClock);

  if (isLocalDeleted && isRemoteDeleted) {
    return null;
  }

  if (isLocalDeleted && !isRemoteDeleted) {
    return resolveLocalDeleted(local, remote, relation);
  }

  if (!isLocalDeleted && isRemoteDeleted) {
    return resolveRemoteDeleted(local, remote, relation);
  }

  return resolveBothExist(local, remote, relation, deviceName);
}

function resolveLocalDeleted(
  local: LocalFileDto,
  remote: RemoteFile,
  relation: ClockRelation,
): SyncActionDto {
  switch (relation) {
    case 'after':
      return { fileId: local.fileId, path: local.path, action: 'delete' };
    case 'before':
    case 'concurrent':
      return createDownloadAction(remote);
    case 'equal':
      return createDownloadAction(remote);
    default: {
      const _exhaustive: never = relation;
      throw new Error(`Unknown clock relation: ${String(_exhaustive)}`);
    }
  }
}

function resolveRemoteDeleted(
  local: LocalFileDto,
  remote: RemoteFile,
  relation: ClockRelation,
): SyncActionDto {
  switch (relation) {
    case 'after':
      return createUploadAction(local);
    case 'before':
      return { fileId: local.fileId, path: local.path, action: 'delete' };
    case 'concurrent':
      return createUploadAction(local);
    case 'equal':
      return { fileId: local.fileId, path: local.path, action: 'delete' };
    default: {
      const _exhaustive: never = relation;
      throw new Error(`Unknown clock relation: ${String(_exhaustive)}`);
    }
  }
}

function resolveBothExist(
  local: LocalFileDto,
  remote: RemoteFile,
  relation: ClockRelation,
  deviceName: string,
): SyncActionDto | null {
  if (local.contentHash === remote.contentHash) {
    if (local.path !== remote.path) {
      if (relation === 'after') return createUploadAction(local);
      return createDownloadAction(remote);
    }

    if (relation === 'before') return createDownloadAction(remote);
    if (relation === 'after') return createUploadAction(local);

    return null;
  }

  switch (relation) {
    case 'after':
      return createUploadAction(local);
    case 'before':
      return createDownloadAction(remote);
    case 'equal':
    case 'concurrent':
      return createConflictAction(local, remote, deviceName);
    default: {
      const _exhaustive: never = relation;
      throw new Error(`Unknown clock relation: ${String(_exhaustive)}`);
    }
  }
}

function createUploadAction(local: LocalFileDto): SyncActionDto {
  return {
    fileId: local.fileId,
    path: local.path,
    action: 'upload',
    size: local.size,
    contentHash: local.contentHash,
  };
}

function createDownloadAction(remote: RemoteFile): SyncActionDto {
  return {
    fileId: remote.id,
    path: remote.path,
    action: 'download',
    size: remote.size,
    contentHash: remote.contentHash,
    remoteVectorClock: remote.vectorClock,
  };
}

function createConflictAction(
  local: LocalFileDto,
  remote: RemoteFile,
  deviceName: string,
): SyncActionDto {
  return {
    fileId: local.fileId,
    path: local.path,
    action: 'conflict',
    size: remote.size,
    contentHash: remote.contentHash,
    remoteVectorClock: remote.vectorClock,
    conflictRename: generateConflictName(remote.path, deviceName),
    conflictCopyId: randomUUID(),
  };
}

function generateConflictName(path: string, deviceName: string): string {
  const lastSlashIndex = path.lastIndexOf('/');
  const dir =
    lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex + 1) : '';
  const fileName =
    lastSlashIndex !== -1 ? path.substring(lastSlashIndex + 1) : path;

  const lastDotIndex = fileName.lastIndexOf('.');
  const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  const base =
    lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

  const truncatedDeviceName =
    deviceName.length > 30 ? deviceName.substring(0, 30) + '...' : deviceName;

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return `${dir}${base} (${truncatedDeviceName} - ${timestamp})${ext}`;
}
