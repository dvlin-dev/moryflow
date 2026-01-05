/**
 * [INPUT]: SyncActionDto[], vaultPath
 * [OUTPUT]: ExecuteResult (completed, deleted, errors)
 * [POS]: 执行具体的同步操作（上传、下载、删除、冲突处理）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { File, Directory, Paths } from 'expo-file-system'
import type { SyncActionDto, CompletedFileDto } from '@moryflow/shared-api/cloud-sync'
import { createEmptyClock, mergeVectorClocks } from '@moryflow/shared-sync'
import { fileIndexManager } from '@/lib/vault/file-index'
import { cloudSyncApi } from './api-client'
import { computeHash } from './file-collector'
import { extractTitle } from './const'

/** 获取文件的 vectorClock */
const getVectorClock = (vaultPath: string, fileId: string) => {
  const entry = fileIndexManager.getAll(vaultPath).find((f) => f.id === fileId)
  return entry?.vectorClock ?? createEmptyClock()
}

// ── 执行单个同步操作 ────────────────────────────────────────

export const executeAction = async (
  action: SyncActionDto,
  vaultPath: string,
  completed: CompletedFileDto[],
  deleted: string[]
): Promise<void> => {
  const absolutePath = Paths.join(vaultPath, action.path)

  switch (action.action) {
    case 'upload': {
      if (!action.url) return
      const file = new File(absolutePath)
      const content = file.textSync()
      const encoder = new TextEncoder()
      const bytes = encoder.encode(content)

      await cloudSyncApi.uploadFile(action.url, bytes)

      const hash = await computeHash(content)
      completed.push({
        fileId: action.fileId,
        action: 'upload',
        path: action.path,
        title: extractTitle(action.path),
        size: bytes.length,
        contentHash: hash,
        vectorClock: getVectorClock(vaultPath, action.fileId),
        expectedHash: action.contentHash,
      })
      break
    }

    case 'download': {
      if (!action.url) return

      // 检查是否是路径变更（文件重命名从远端同步到本地）
      const existingPath = fileIndexManager.getByFileId(vaultPath, action.fileId)
      if (existingPath && existingPath !== action.path) {
        const oldAbsPath = Paths.join(vaultPath, existingPath)
        const oldFile = new File(oldAbsPath)
        if (oldFile.exists) {
          oldFile.delete()
        }
      }

      // 确保目录存在
      const parentPath = Paths.dirname(absolutePath)
      const parentDir = new Directory(parentPath)
      if (!parentDir.exists) {
        parentDir.create({ intermediates: true })
      }

      const content = await cloudSyncApi.downloadFile(action.url)
      const file = new File(absolutePath)
      file.write(content)

      // 为下载的文件设置 fileId 映射
      await fileIndexManager.setMany(vaultPath, [{ path: action.path, fileId: action.fileId }])

      const hash = action.contentHash ?? (await computeHash(content))
      const encoder = new TextEncoder()
      completed.push({
        fileId: action.fileId,
        action: 'download',
        path: action.path,
        title: extractTitle(action.path),
        size: encoder.encode(content).length,
        contentHash: hash,
        vectorClock: action.remoteVectorClock ?? createEmptyClock(),
      })
      break
    }

    case 'delete': {
      const file = new File(absolutePath)
      if (file.exists) {
        file.delete()
      }
      await fileIndexManager.delete(vaultPath, action.path)
      deleted.push(action.fileId)
      break
    }

    case 'conflict': {
      if (!action.conflictRename || !action.url || !action.uploadUrl) return

      // 冲突策略：以本地为准
      // 1. 下载云端版本保存为冲突副本
      // 2. 上传本地版本覆盖云端

      const conflictAbsPath = Paths.join(vaultPath, action.conflictRename)

      // 确保目录存在
      const conflictParentPath = Paths.dirname(conflictAbsPath)
      const conflictParentDir = new Directory(conflictParentPath)
      if (!conflictParentDir.exists) {
        conflictParentDir.create({ intermediates: true })
      }

      // 1. 下载云端版本保存为冲突副本
      const remoteContent = await cloudSyncApi.downloadFile(action.url)
      new File(conflictAbsPath).write(remoteContent)

      // 为冲突副本创建新的 fileId
      await fileIndexManager.getOrCreate(vaultPath, action.conflictRename)

      // 2. 读取本地文件并上传覆盖云端
      const localFile = new File(absolutePath)
      const localContent = localFile.textSync()
      const encoder = new TextEncoder()
      const localBytes = encoder.encode(localContent)

      await cloudSyncApi.uploadFile(action.uploadUrl, localBytes)

      const localHash = await computeHash(localContent)

      // 合并本地和远端的向量时钟
      const localClock = getVectorClock(vaultPath, action.fileId)
      const remoteClock = action.remoteVectorClock ?? createEmptyClock()
      const mergedClock = mergeVectorClocks(localClock, remoteClock)

      completed.push({
        fileId: action.fileId,
        action: 'conflict',
        path: action.path,
        title: extractTitle(action.path),
        size: localBytes.length,
        contentHash: localHash,
        vectorClock: mergedClock,
        expectedHash: action.contentHash,
      })
      break
    }
  }
}

// ── 批量执行同步操作 ────────────────────────────────────────

export interface ExecuteResult {
  completed: CompletedFileDto[]
  deleted: string[]
  errors: Array<{ action: SyncActionDto; error: Error }>
}

/** 批量执行同步操作，收集结果 */
export const executeActions = async (
  actions: SyncActionDto[],
  vaultPath: string
): Promise<ExecuteResult> => {
  const completed: CompletedFileDto[] = []
  const deleted: string[] = []
  const errors: Array<{ action: SyncActionDto; error: Error }> = []

  for (const action of actions) {
    try {
      await executeAction(action, vaultPath, completed, deleted)
    } catch (e) {
      errors.push({
        action,
        error: e instanceof Error ? e : new Error(String(e)),
      })
      console.error('[CloudSync] Execute action failed:', action.action, action.path, e)
    }
  }

  return { completed, deleted, errors }
}
