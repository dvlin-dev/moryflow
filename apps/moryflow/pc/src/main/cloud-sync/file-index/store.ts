/**
 * FileIndex - IO 层
 * 单一职责：文件读写操作 + 版本迁移
 */

import path from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import type { FileIndexStore, FileEntry, LegacyFileEntry } from '@aiget/api'
import { FILE_INDEX_STORE_PATH } from '../const.js'

const getStorePath = (vaultPath: string) =>
  path.join(vaultPath, FILE_INDEX_STORE_PATH)

/** 当前版本号 */
const CURRENT_VERSION = 2

/** 旧版存储格式 */
interface LegacyFileIndexStore {
  files: LegacyFileEntry[]
}

/** 迁移旧版 FileEntry 到新版 */
const migrateEntry = (legacy: LegacyFileEntry): FileEntry => ({
  id: legacy.id,
  path: legacy.path,
  createdAt: legacy.createdAt,
  vectorClock: {},
  lastSyncedHash: null,
  lastSyncedClock: {},
})

/** 迁移旧版存储到新版 */
const migrateStore = (legacy: LegacyFileIndexStore): FileIndexStore => ({
  version: CURRENT_VERSION,
  files: legacy.files.map(migrateEntry),
})

/** 从文件加载（自动迁移旧版） */
export const loadStore = async (vaultPath: string): Promise<FileIndexStore> => {
  try {
    const content = await readFile(getStorePath(vaultPath), 'utf-8')
    const parsed = JSON.parse(content)

    // 检查版本，如果是旧版则迁移
    if (!parsed.version || parsed.version < CURRENT_VERSION) {
      return migrateStore(parsed as LegacyFileIndexStore)
    }

    return parsed as FileIndexStore
  } catch {
    return { version: CURRENT_VERSION, files: [] }
  }
}

/** 保存到文件 */
export const saveStore = async (
  vaultPath: string,
  store: FileIndexStore
): Promise<void> => {
  const storePath = getStorePath(vaultPath)
  await mkdir(path.dirname(storePath), { recursive: true })
  // 确保保存时带版本号
  const storeWithVersion = { ...store, version: CURRENT_VERSION }
  await writeFile(storePath, JSON.stringify(storeWithVersion, null, 2))
}
