/**
 * FileIndex 文件索引类型定义
 *
 * 用于 PC 和 Mobile 共享的文件索引数据结构
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新：
 * - apps/pc/src/main/cloud-sync/file-index/
 * - packages/shared-sync/src/types.ts
 */

// 从 sync 导入并重导出 VectorClock
export type { VectorClock } from '@aiget/sync'
import type { VectorClock } from '@aiget/sync'

/** 单个文件条目 */
export interface FileEntry {
  /** 文件唯一标识 (UUID) */
  id: string
  /** 相对路径 */
  path: string
  /** 创建时间（首次分配 fileId 的时间） */
  createdAt: number

  // ── 向量时钟相关字段 ──────────────────────────────────
  /** 当前向量时钟状态 */
  vectorClock: VectorClock
  /** 上次同步成功时的内容哈希，null 表示从未同步 */
  lastSyncedHash: string | null
  /** 上次同步成功时的时钟状态 */
  lastSyncedClock: VectorClock
}

/** 旧版 FileEntry（用于迁移） */
export interface LegacyFileEntry {
  id: string
  path: string
  createdAt: number
}

/** 存储格式 */
export interface FileIndexStore {
  /** 版本号：2 表示向量时钟版本 */
  version?: number
  files: FileEntry[]
}

/** FileIndex 管理器接口 */
export interface IFileIndexManager {
  /** 加载指定 vault 的数据到内存 */
  load(vaultPath: string): Promise<void>

  /** 清除指定 vault 的缓存 */
  clearCache(vaultPath: string): void

  /** 扫描目录，为所有 md 文件创建 fileId，返回新建数量 */
  scanAndCreateIds(vaultPath: string): Promise<number>

  /** 获取或创建 fileId */
  getOrCreate(vaultPath: string, relativePath: string): Promise<string>

  /** 正向查询：path → fileId */
  getByPath(vaultPath: string, relativePath: string): string | null

  /** 反向查询：fileId → path */
  getByFileId(vaultPath: string, fileId: string): string | null

  /** 重命名：更新 path，fileId 不变 */
  move(vaultPath: string, oldPath: string, newPath: string): Promise<void>

  /** 删除：移除条目，返回被删除的 fileId */
  delete(vaultPath: string, relativePath: string): Promise<string | null>

  /** 批量设置：用于云同步下载 */
  setMany(
    vaultPath: string,
    entries: Array<{ path: string; fileId: string }>
  ): Promise<void>

  /** 获取所有条目 */
  getAll(vaultPath: string): FileEntry[]

  /** 获取文件总数 */
  getCount(vaultPath: string): number
}
