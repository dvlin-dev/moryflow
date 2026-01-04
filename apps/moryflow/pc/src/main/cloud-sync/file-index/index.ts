/**
 * FileIndex - 文件索引管理器
 * 单一职责：管理文件路径与 fileId (UUID) 的双向映射
 *
 * 设计要点：
 * - 数组结构存储，Array.find() 查询
 * - 多 Vault 缓存支持
 * - fileId 在文件重命名/移动时保持不变
 * - 防抖保存避免并发写入竞争
 * - 向量时钟支持（v2）
 */

import type { FileEntry, IFileIndexManager } from '@aiget/api'
import {
  type VectorClock,
  incrementClock as sharedIncrementClock,
  mergeVectorClocks,
} from '@aiget/sync'
import { loadStore, saveStore } from './store.js'
import { scanMdFiles } from './scanner.js'
import { createLogger } from '../logger.js'

const log = createLogger('file-index')

// ── 缓存管理 ──────────────────────────────────────────────────

/** 多 vault 缓存 */
const cache = new Map<string, FileEntry[]>()

/** 防抖保存定时器 */
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** 防抖保存延迟 (ms) */
const SAVE_DEBOUNCE_DELAY = 100

const getFiles = (vaultPath: string): FileEntry[] => cache.get(vaultPath) ?? []

/** 创建新的 FileEntry（带向量时钟初始值） */
const createEntry = (id: string, relativePath: string): FileEntry => ({
  id,
  path: relativePath,
  createdAt: Date.now(),
  vectorClock: {},
  lastSyncedHash: null,
  lastSyncedClock: {},
})

/**
 * 防抖保存：避免快速连续操作导致的并发写入竞争
 */
const debouncedSave = (vaultPath: string): Promise<void> => {
  return new Promise((resolve) => {
    // 清除之前的定时器
    const existingTimer = saveTimers.get(vaultPath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // 设置新定时器
    const timer = setTimeout(async () => {
      saveTimers.delete(vaultPath)
      const files = getFiles(vaultPath)
      await saveStore(vaultPath, { files })
      resolve()
    }, SAVE_DEBOUNCE_DELAY)

    saveTimers.set(vaultPath, timer)
  })
}

/**
 * 立即保存：用于需要确保数据持久化的场景
 */
const saveImmediately = async (vaultPath: string): Promise<void> => {
  // 清除防抖定时器
  const existingTimer = saveTimers.get(vaultPath)
  if (existingTimer) {
    clearTimeout(existingTimer)
    saveTimers.delete(vaultPath)
  }

  const files = getFiles(vaultPath)
  await saveStore(vaultPath, { files })
}

// ── FileIndexManager 实现 ─────────────────────────────────────

export const fileIndexManager: IFileIndexManager = {
  /** 加载指定 vault 的数据到内存 */
  async load(vaultPath: string): Promise<void> {
    const store = await loadStore(vaultPath)
    cache.set(vaultPath, store.files ?? [])
  },

  /** 清除指定 vault 的缓存 */
  clearCache(vaultPath: string): void {
    // 清除防抖定时器
    const timer = saveTimers.get(vaultPath)
    if (timer) {
      clearTimeout(timer)
      saveTimers.delete(vaultPath)
    }
    cache.delete(vaultPath)
  },

  /**
   * 扫描目录，为所有 md 文件创建 fileId，同时清理已删除文件的条目
   * @returns 新建数量
   */
  async scanAndCreateIds(vaultPath: string): Promise<number> {
    const files = getFiles(vaultPath)
    const mdPaths = await scanMdFiles(vaultPath)

    // 使用 Set 优化查询 O(1)
    const mdPathsSet = new Set(mdPaths)
    const existingPathsSet = new Set(files.map((f) => f.path))

    // 清理已删除的条目
    const beforeCount = files.length
    const validFiles = files.filter((f) => mdPathsSet.has(f.path))

    // 添加新文件
    let created = 0
    for (const relativePath of mdPaths) {
      if (!existingPathsSet.has(relativePath)) {
        validFiles.push(createEntry(crypto.randomUUID(), relativePath))
        created++
      }
    }

    // 有变更时保存
    const removed = beforeCount - validFiles.length + created
    if (removed !== created || created > 0) {
      cache.set(vaultPath, validFiles)
      await saveImmediately(vaultPath)
    }

    return created
  },

  /** 获取或创建 fileId */
  async getOrCreate(vaultPath: string, relativePath: string): Promise<string> {
    const files = getFiles(vaultPath)
    let entry = files.find((f) => f.path === relativePath)

    if (!entry) {
      entry = createEntry(crypto.randomUUID(), relativePath)
      files.push(entry)
      cache.set(vaultPath, files)
      debouncedSave(vaultPath).catch((error) => {
        console.error('[file-index] save failed:', vaultPath, error)
      })
    }

    return entry.id
  },

  /** 正向查询：path → fileId */
  getByPath(vaultPath: string, relativePath: string): string | null {
    return getFiles(vaultPath).find((f) => f.path === relativePath)?.id ?? null
  },

  /** 反向查询：fileId → path */
  getByFileId(vaultPath: string, fileId: string): string | null {
    return getFiles(vaultPath).find((f) => f.id === fileId)?.path ?? null
  },

  /** 重命名：更新 path，fileId 不变 */
  async move(
    vaultPath: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    const files = getFiles(vaultPath)
    const entry = files.find((f) => f.path === oldPath)
    if (entry) {
      entry.path = newPath
      debouncedSave(vaultPath).catch((error) => {
        console.error('[file-index] save failed:', vaultPath, error)
      })
    }
  },

  /** 删除：移除条目，返回被删除的 fileId */
  async delete(
    vaultPath: string,
    relativePath: string
  ): Promise<string | null> {
    const files = getFiles(vaultPath)
    const index = files.findIndex((f) => f.path === relativePath)
    if (index === -1) return null

    const [removed] = files.splice(index, 1)
    debouncedSave(vaultPath).catch((error) => {
      log.error('save failed:', vaultPath, error)
    })
    return removed.id
  },

  /** 批量设置：用于云同步下载 */
  async setMany(
    vaultPath: string,
    entries: Array<{ path: string; fileId: string }>
  ): Promise<void> {
    const files = getFiles(vaultPath)

    for (const { path: p, fileId } of entries) {
      // 检查 path 冲突：移除同 path 但不同 fileId 的条目
      const existingByPathIndex = files.findIndex(
        (f) => f.path === p && f.id !== fileId
      )
      if (existingByPathIndex !== -1) {
        files.splice(existingByPathIndex, 1)
      }

      // 更新或添加
      const existing = files.find((f) => f.id === fileId)
      if (existing) {
        existing.path = p
      } else {
        files.push(createEntry(fileId, p))
      }
    }

    cache.set(vaultPath, files)
    await saveImmediately(vaultPath)
  },

  /** 获取所有条目（返回浅拷贝，避免外部意外修改缓存） */
  getAll(vaultPath: string): FileEntry[] {
    return [...getFiles(vaultPath)]
  },

  /** 获取文件总数 */
  getCount(vaultPath: string): number {
    return getFiles(vaultPath).length
  },
}

// ── 向量时钟辅助函数（供 sync-engine 使用）────────────────────

/** 递增向量时钟 */
export const incrementClock = sharedIncrementClock

/** 合并两个向量时钟（取每个分量的最大值） */
export const mergeClocks = mergeVectorClocks

/** 获取 FileEntry（内部使用） */
export const getEntry = (vaultPath: string, fileId: string): FileEntry | undefined => {
  return getFiles(vaultPath).find((f) => f.id === fileId)
}

/** 更新 FileEntry（内部使用，需要调用 saveImmediately 保存） */
export const updateEntry = (
  vaultPath: string,
  fileId: string,
  updates: Partial<Pick<FileEntry, 'vectorClock' | 'lastSyncedHash' | 'lastSyncedClock' | 'path'>>
): void => {
  const files = getFiles(vaultPath)
  const entry = files.find((f) => f.id === fileId)
  if (entry) {
    Object.assign(entry, updates)
  }
}

/** 添加新 FileEntry */
export const addEntry = (vaultPath: string, entry: FileEntry): void => {
  const files = getFiles(vaultPath)
  files.push(entry)
  cache.set(vaultPath, files)
}

/** 删除 FileEntry */
export const removeEntry = (vaultPath: string, fileId: string): void => {
  const files = getFiles(vaultPath)
  const index = files.findIndex((f) => f.id === fileId)
  if (index !== -1) {
    files.splice(index, 1)
  }
}

/** 立即保存 FileIndex */
export const saveFileIndex = async (vaultPath: string): Promise<void> => {
  await saveImmediately(vaultPath)
}
