/**
 * Cloud Sync - 防抖调度器
 * 单一职责：管理同步和向量化的防抖调度
 */

import path from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import {
  SYNC_DEBOUNCE_DELAY,
  VECTORIZE_DEBOUNCE_DELAY,
  VECTORIZE_MAX_SIZE,
} from '../const.js'
import { readSettings, readBinding } from '../store.js'
import { cloudSyncApi } from '../api/client.js'
import { fileIndexManager } from '../file-index/index.js'
import { isMarkdownFile } from './executor.js'
import { createLogger } from '../logger.js'

const log = createLogger('scheduler')

// ── 同步调度 ────────────────────────────────────────────────

let syncDebounceTimer: NodeJS.Timeout | null = null

/** 调度一次同步（防抖） */
export const scheduleSync = (performSync: () => Promise<void>): void => {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer)
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null
    void performSync()
  }, SYNC_DEBOUNCE_DELAY)
}

/** 取消已调度的同步 */
export const cancelScheduledSync = (): void => {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer)
    syncDebounceTimer = null
  }
}

/** 检查是否有等待中的同步 */
export const hasPendingSync = (): boolean => syncDebounceTimer !== null

// ── 向量化调度 ──────────────────────────────────────────────

/** key: `${vaultPath}:${relativePath}` */
const vectorizeTimers = new Map<string, NodeJS.Timeout>()

/** 调度向量化（防抖） */
export const scheduleVectorize = (vaultPath: string, relativePath: string): void => {
  // 只处理 Markdown 文件
  if (!isMarkdownFile(relativePath)) return

  const key = `${vaultPath}:${relativePath}`
  const existing = vectorizeTimers.get(key)
  if (existing) {
    clearTimeout(existing)
  }

  const timer = setTimeout(() => {
    vectorizeTimers.delete(key)
    void performVectorize(vaultPath, relativePath)
  }, VECTORIZE_DEBOUNCE_DELAY)

  vectorizeTimers.set(key, timer)
}

/** 取消特定文件的向量化调度 */
export const cancelVectorize = (vaultPath: string, relativePath: string): void => {
  const key = `${vaultPath}:${relativePath}`
  const timer = vectorizeTimers.get(key)
  if (timer) {
    clearTimeout(timer)
    vectorizeTimers.delete(key)
  }
}

/** 取消所有向量化调度 */
export const cancelAllVectorize = (): void => {
  for (const timer of vectorizeTimers.values()) {
    clearTimeout(timer)
  }
  vectorizeTimers.clear()
}

// ── 执行向量化 ──────────────────────────────────────────────

const performVectorize = async (vaultPath: string, relativePath: string): Promise<void> => {
  const settings = readSettings()
  const binding = readBinding(vaultPath)

  if (!settings.vectorizeEnabled) return
  if (!binding) return

  const absolutePath = path.join(vaultPath, relativePath)

  try {
    const stats = await stat(absolutePath)
    if (stats.size > VECTORIZE_MAX_SIZE) {
      log.warn('file too large for vectorize:', relativePath, stats.size)
      return
    }

    const content = await readFile(absolutePath, 'utf-8')
    const fileId = await fileIndexManager.getOrCreate(vaultPath, relativePath)

    await cloudSyncApi.vectorizeFile({
      fileId,
      vaultId: binding.vaultId,
      fileName: path.basename(relativePath),
      content,
    })

    log.info('vectorize queued:', relativePath)
  } catch (error) {
    // 向量化失败不影响同步流程
    log.warn('vectorize failed:', relativePath, error)
  }
}
