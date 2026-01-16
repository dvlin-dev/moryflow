/**
 * Cloud Sync - 同步操作执行器
 * 单一职责：检测本地变更 + 执行同步操作（上传、下载、删除、冲突处理）
 *
 * 核心原则：状态变更只在 commit 成功后执行
 * - detectLocalChanges: 只读，返回 DTOs 和 pendingChanges
 * - executeActions: 只做 I/O，不修改 FileIndex
 * - applyChangesToFileIndex: commit 成功后调用，修改 FileIndex
 */

import path from 'node:path'
import crypto from 'node:crypto'
import { readFile, writeFile, stat, mkdir, unlink } from 'node:fs/promises'
import type { FileEntry } from '@anyhunt/api'
import type { VectorClock } from '@anyhunt/sync'
import type { SyncActionDto, CompletedFileDto, LocalFileDto } from '../api/types.js'
import type { SyncDirection } from '../const.js'
import {
  fileIndexManager,
  incrementClock,
  mergeClocks,
  getEntry,
  updateEntry,
  addEntry,
  removeEntry,
  saveFileIndex,
} from '../file-index/index.js'
import { activityTracker } from './activity-tracker.js'
import { createLogger } from '../logger.js'

const log = createLogger('executor')

// ── 常量 ────────────────────────────────────────────────────

/** 网络请求超时时间 (ms) */
const FETCH_TIMEOUT = 30000

// ── 网络请求工具 ────────────────────────────────────────────

/** 带超时控制的 fetch */
const fetchWithTimeout = async (
  url: string,
  options?: RequestInit,
  timeout: number = FETCH_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时 (${timeout}ms)`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── 工具函数 ────────────────────────────────────────────────

/** 计算文件内容的 SHA256 哈希 */
export const computeHash = async (filePath: string): Promise<string> => {
  const content = await readFile(filePath)
  return crypto.createHash('sha256').update(content).digest('hex')
}

/** 计算 Buffer 内容的 SHA256 哈希 */
export const computeBufferHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/** 获取相对路径 */
export const getRelativePath = (vaultPath: string, absolutePath: string): string =>
  path.relative(vaultPath, absolutePath)

/** 判断是否为 Markdown 文件（支持 .md 和 .markdown） */
export const isMarkdownFile = (filePath: string): boolean => {
  const lower = filePath.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown')
}

/** 从文件路径提取标题（文件名不含扩展名） */
const extractTitle = (filePath: string): string =>
  path.basename(filePath, path.extname(filePath))

// ── 待提交的状态变更 ────────────────────────────────────────

/** 待提交的状态变更（暂存，不立即应用） */
export interface PendingChange {
  type: 'new' | 'modified' | 'deleted'
  fileId: string
  path: string
  vectorClock: VectorClock
  contentHash: string
}

/** 检测本地变更的结果 */
export interface DetectChangesResult {
  dtos: LocalFileDto[]
  pendingChanges: Map<string, PendingChange>
}

// ── 检测本地变更（只读）────────────────────────────────────

/**
 * 检测本地变更
 * 重要：此函数是只读的，不修改 FileIndex
 */
export const detectLocalChanges = async (
  vaultPath: string,
  deviceId: string
): Promise<DetectChangesResult> => {
  const entries = fileIndexManager.getAll(vaultPath)
  const dtos: LocalFileDto[] = []
  const pendingChanges = new Map<string, PendingChange>()

  // 1. 处理当前存在的文件
  for (const entry of entries) {
    const absolutePath = path.join(vaultPath, entry.path)

    try {
      const stats = await stat(absolutePath)
      if (!stats.isFile()) continue

      const currentHash = await computeHash(absolutePath)

      // 比较内容哈希检测变更
      const hasChanged = currentHash !== entry.lastSyncedHash
      const clockToSend = hasChanged
        ? incrementClock(entry.vectorClock, deviceId)
        : entry.vectorClock

      dtos.push({
        fileId: entry.id,
        path: entry.path,
        title: extractTitle(entry.path),
        size: stats.size,
        contentHash: currentHash,
        vectorClock: clockToSend,
      })

      if (hasChanged) {
        pendingChanges.set(entry.id, {
          type: entry.lastSyncedHash === null ? 'new' : 'modified',
          fileId: entry.id,
          path: entry.path,
          vectorClock: clockToSend,
          contentHash: currentHash,
        })
      }
    } catch {
      // 文件不存在（已删除）
      // 只有同步过的文件才需要通知服务端删除
      if (entry.lastSyncedHash !== null) {
        const deleteClock = incrementClock(entry.vectorClock, deviceId)

        dtos.push({
          fileId: entry.id,
          path: entry.path,
          title: extractTitle(entry.path),
          size: 0,
          contentHash: '', // 空 hash 表示删除
          vectorClock: deleteClock,
        })

        pendingChanges.set(entry.id, {
          type: 'deleted',
          fileId: entry.id,
          path: entry.path,
          vectorClock: deleteClock,
          contentHash: '',
        })
      }
    }
  }

  return { dtos, pendingChanges }
}

// ── 执行结果类型 ────────────────────────────────────────────

/** 下载的文件信息（用于后续更新 FileIndex） */
export interface DownloadedEntry {
  fileId: string
  path: string
  vectorClock: VectorClock
  contentHash: string
}

/** 冲突处理信息（用于后续更新 FileIndex） */
export interface ConflictEntry {
  originalFileId: string
  originalPath: string
  mergedClock: VectorClock
  contentHash: string
  conflictCopyId: string
  conflictCopyPath: string
  conflictCopyClock: VectorClock
  conflictCopyHash: string
}

export interface ExecuteResult {
  completed: CompletedFileDto[]
  deleted: string[]
  downloadedEntries: DownloadedEntry[]
  conflictEntries: ConflictEntry[]
  errors: Array<{ action: SyncActionDto; error: Error }>
}

// ── 执行单个同步操作 ────────────────────────────────────────

export const executeAction = async (
  action: SyncActionDto,
  vaultPath: string,
  deviceId: string,
  pendingChanges: Map<string, PendingChange>,
  completed: CompletedFileDto[],
  deleted: string[],
  downloadedEntries: DownloadedEntry[],
  conflictEntries: ConflictEntry[]
): Promise<void> => {
  const absolutePath = path.join(vaultPath, action.path)

  switch (action.action) {
    case 'upload': {
      if (!action.url) return
      const content = await readFile(absolutePath)
      const res = await fetchWithTimeout(action.url, {
        method: 'PUT',
        body: new Uint8Array(content),
        headers: { 'Content-Type': 'application/octet-stream' },
      })
      if (!res.ok) {
        throw new Error(`上传失败: ${res.status} ${res.statusText}`)
      }
      const hash = computeBufferHash(content)
      const pending = pendingChanges.get(action.fileId)
      completed.push({
        fileId: action.fileId,
        action: 'upload',
        path: action.path,
        title: extractTitle(action.path),
        size: content.length,
        contentHash: hash,
        vectorClock: pending?.vectorClock ?? {},
      })
      break
    }

    case 'download': {
      if (!action.url) return

      // 检查是否是路径变更（文件重命名从远端同步到本地）
      const existingPath = fileIndexManager.getByFileId(vaultPath, action.fileId)
      if (existingPath && existingPath !== action.path) {
        // 删除旧路径的文件
        const oldAbsPath = path.join(vaultPath, existingPath)
        try {
          await unlink(oldAbsPath)
        } catch {
          // 文件可能已不存在
        }
      }

      // 确保目录存在
      await mkdir(path.dirname(absolutePath), { recursive: true })
      const res = await fetchWithTimeout(action.url)
      if (!res.ok) {
        throw new Error(`下载失败: ${res.status} ${res.statusText}`)
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      await writeFile(absolutePath, buffer)

      const hash = action.contentHash ?? computeBufferHash(buffer)
      const remoteClock = action.remoteVectorClock ?? {}

      completed.push({
        fileId: action.fileId,
        action: 'download',
        path: action.path,
        title: extractTitle(action.path),
        size: buffer.length,
        contentHash: hash,
        vectorClock: remoteClock,
      })

      // 记录下载信息，用于后续更新 FileIndex
      downloadedEntries.push({
        fileId: action.fileId,
        path: action.path,
        vectorClock: remoteClock,
        contentHash: hash,
      })
      break
    }

    case 'delete': {
      try {
        await unlink(absolutePath)
      } catch {
        // 文件可能已不存在
      }
      deleted.push(action.fileId)
      break
    }

    case 'conflict': {
      if (!action.conflictRename || !action.url || !action.uploadUrl) return
      // 使用服务端生成的冲突副本 ID
      if (!action.conflictCopyId) return

      const conflictAbsPath = path.join(vaultPath, action.conflictRename)
      await mkdir(path.dirname(conflictAbsPath), { recursive: true })

      // 1. 下载云端版本保存为冲突副本
      const downloadRes = await fetchWithTimeout(action.url)
      if (!downloadRes.ok) {
        throw new Error(`下载冲突版本失败: ${downloadRes.status} ${downloadRes.statusText}`)
      }
      const remoteBuffer = Buffer.from(await downloadRes.arrayBuffer())
      await writeFile(conflictAbsPath, remoteBuffer)

      // 2. 上传冲突副本到 R2（如果有 URL）
      const remoteHash = action.contentHash ?? computeBufferHash(remoteBuffer)
      if (action.conflictCopyUploadUrl) {
        const copyUploadRes = await fetchWithTimeout(action.conflictCopyUploadUrl, {
          method: 'PUT',
          body: new Uint8Array(remoteBuffer),
          headers: { 'Content-Type': 'application/octet-stream' },
        })
        if (!copyUploadRes.ok) {
          throw new Error(`上传冲突副本失败: ${copyUploadRes.status} ${copyUploadRes.statusText}`)
        }
      }

      // 3. 读取本地文件并上传覆盖云端原始文件
      const localContent = await readFile(absolutePath)
      const uploadRes = await fetchWithTimeout(action.uploadUrl, {
        method: 'PUT',
        body: new Uint8Array(localContent),
        headers: { 'Content-Type': 'application/octet-stream' },
      })
      if (!uploadRes.ok) {
        throw new Error(`上传本地版本失败: ${uploadRes.status} ${uploadRes.statusText}`)
      }

      const localHash = computeBufferHash(localContent)
      const remoteClock = action.remoteVectorClock ?? {}

      // 获取本地 pending 时钟
      const pending = pendingChanges.get(action.fileId)
      const localClock = pending?.vectorClock ?? {}

      // 合并时钟并递增
      const mergedClock = mergeClocks(localClock, remoteClock)
      const finalClock = incrementClock(mergedClock, deviceId)

      // 4. 原始文件（本地版本覆盖云端）
      completed.push({
        fileId: action.fileId,
        action: 'conflict',
        path: action.path,
        title: extractTitle(action.path),
        size: localContent.length,
        contentHash: localHash,
        vectorClock: finalClock,
      })

      // 5. 冲突副本（云端版本保存为新文件）
      completed.push({
        fileId: action.conflictCopyId,
        action: 'upload', // 冲突副本作为新上传处理
        path: action.conflictRename,
        title: extractTitle(action.conflictRename),
        size: remoteBuffer.length,
        contentHash: remoteHash,
        vectorClock: remoteClock, // 使用远端时钟
      })

      // 记录冲突信息，用于后续更新 FileIndex
      conflictEntries.push({
        originalFileId: action.fileId,
        originalPath: action.path,
        mergedClock: finalClock,
        contentHash: localHash,
        conflictCopyId: action.conflictCopyId,
        conflictCopyPath: action.conflictRename,
        conflictCopyClock: remoteClock,
        conflictCopyHash: remoteHash,
      })
      break
    }
  }
}

// ── 批量执行同步操作 ────────────────────────────────────────

/** 批量执行同步操作，收集结果 */
export const executeActions = async (
  actions: SyncActionDto[],
  vaultPath: string,
  deviceId: string,
  pendingChanges: Map<string, PendingChange>
): Promise<ExecuteResult> => {
  const completed: CompletedFileDto[] = []
  const deleted: string[] = []
  const downloadedEntries: DownloadedEntry[] = []
  const conflictEntries: ConflictEntry[] = []
  const errors: Array<{ action: SyncActionDto; error: Error }> = []

  for (const action of actions) {
    try {
      await executeAction(
        action,
        vaultPath,
        deviceId,
        pendingChanges,
        completed,
        deleted,
        downloadedEntries,
        conflictEntries
      )
    } catch (e) {
      errors.push({
        action,
        error: e instanceof Error ? e : new Error(String(e)),
      })
      log.error('execute action failed:', action.action, action.path, e)
    }
  }

  return { completed, deleted, downloadedEntries, conflictEntries, errors }
}

// ── 工具函数：action 类型转换为 direction ────────────────────

const actionToDirection = (action: SyncActionDto['action']): SyncDirection => {
  switch (action) {
    case 'upload':
      return 'upload'
    case 'download':
      return 'download'
    case 'delete':
      return 'delete'
    case 'conflict':
      return 'download' // 冲突处理视为下载新版本
  }
}

/** 带活动追踪的批量执行同步操作 */
export const executeActionsWithTracking = async (
  actions: SyncActionDto[],
  vaultPath: string,
  deviceId: string,
  pendingChanges: Map<string, PendingChange>,
  onProgress?: () => void
): Promise<ExecuteResult> => {
  const completed: CompletedFileDto[] = []
  const deleted: string[] = []
  const downloadedEntries: DownloadedEntry[] = []
  const conflictEntries: ConflictEntry[] = []
  const errors: Array<{ action: SyncActionDto; error: Error }> = []

  for (const action of actions) {
    const direction = actionToDirection(action.action)

    // 开始当前文件的同步活动
    activityTracker.startActivity(
      action.fileId,
      action.path,
      direction,
      action.size
    )

    // 通知 UI 更新
    onProgress?.()

    try {
      await executeAction(
        action,
        vaultPath,
        deviceId,
        pendingChanges,
        completed,
        deleted,
        downloadedEntries,
        conflictEntries
      )

      // 完成当前活动
      const completedItem = completed.find((c) => c.fileId === action.fileId)
      activityTracker.completeActivity(completedItem?.size)
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      errors.push({ action, error })

      // 标记活动失败
      activityTracker.failActivity(error.message)

      log.error('execute action failed:', action.action, action.path, e)
    }

    // 每个操作完成后通知 UI 更新
    onProgress?.()
  }

  return { completed, deleted, downloadedEntries, conflictEntries, errors }
}

// ── 应用变更到 FileIndex（成功后）────────────────────────────

/**
 * 同步成功后更新本地索引
 * 重要：只有在 commit 成功后才调用此函数
 */
export const applyChangesToFileIndex = async (
  vaultPath: string,
  pendingChanges: Map<string, PendingChange>,
  executeResult: ExecuteResult,
  completedIds: Set<string>
): Promise<void> => {
  // 1. 应用本地变更（new/modified/deleted）
  for (const [fileId, change] of pendingChanges) {
    if (!completedIds.has(fileId)) continue

    switch (change.type) {
      case 'new':
      case 'modified': {
        updateEntry(vaultPath, fileId, {
          vectorClock: change.vectorClock,
          lastSyncedHash: change.contentHash,
          lastSyncedClock: change.vectorClock,
        })
        break
      }

      case 'deleted': {
        removeEntry(vaultPath, fileId)
        break
      }
    }
  }

  // 2. 应用下载的文件
  for (const entry of executeResult.downloadedEntries) {
    const existing = getEntry(vaultPath, entry.fileId)
    if (existing) {
      updateEntry(vaultPath, entry.fileId, {
        path: entry.path,
        vectorClock: entry.vectorClock,
        lastSyncedHash: entry.contentHash,
        lastSyncedClock: entry.vectorClock,
      })
    } else {
      addEntry(vaultPath, {
        id: entry.fileId,
        path: entry.path,
        createdAt: Date.now(),
        vectorClock: entry.vectorClock,
        lastSyncedHash: entry.contentHash,
        lastSyncedClock: entry.vectorClock,
      })
    }
  }

  // 3. 应用删除的文件
  for (const fileId of executeResult.deleted) {
    removeEntry(vaultPath, fileId)
  }

  // 4. 应用冲突处理
  for (const conflict of executeResult.conflictEntries) {
    // 更新原始文件
    updateEntry(vaultPath, conflict.originalFileId, {
      vectorClock: conflict.mergedClock,
      lastSyncedHash: conflict.contentHash,
      lastSyncedClock: conflict.mergedClock,
    })

    // 添加冲突副本
    addEntry(vaultPath, {
      id: conflict.conflictCopyId,
      path: conflict.conflictCopyPath,
      createdAt: Date.now(),
      vectorClock: conflict.conflictCopyClock,
      lastSyncedHash: conflict.conflictCopyHash,
      lastSyncedClock: conflict.conflictCopyClock,
    })
  }

  // 5. 保存 FileIndex
  await saveFileIndex(vaultPath)
}
