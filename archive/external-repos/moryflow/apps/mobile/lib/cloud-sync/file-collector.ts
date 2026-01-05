/**
 * [INPUT]: vaultPath
 * [OUTPUT]: LocalFileDto[]
 * [POS]: 收集本地文件元数据，用于同步差异计算
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { File, Paths } from 'expo-file-system'
import { digestStringAsync, CryptoDigestAlgorithm, CryptoEncoding } from 'expo-crypto'
import type { LocalFileDto } from '@moryflow/shared-api/cloud-sync'
import { fileIndexManager } from '@/lib/vault/file-index'
import { extractTitle, MAX_SYNC_FILE_SIZE } from './const'

// ── 工具函数 ────────────────────────────────────────────────

/** 计算文件内容的 SHA256 哈希 */
export const computeHash = async (content: string): Promise<string> => {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, content, {
    encoding: CryptoEncoding.HEX,
  })
}

// ── 收集本地文件信息 ────────────────────────────────────────

/** 收集 vault 中所有已跟踪文件的信息 */
export const collectLocalFiles = async (vaultPath: string): Promise<LocalFileDto[]> => {
  const entries = fileIndexManager.getAll(vaultPath)
  const localFiles: LocalFileDto[] = []

  for (const entry of entries) {
    const absolutePath = Paths.join(vaultPath, entry.path)
    try {
      const file = new File(absolutePath)
      if (!file.exists) continue

      // 大文件保护：跳过超过阈值的文件
      if (file.size && file.size > MAX_SYNC_FILE_SIZE) {
        console.warn(`[CloudSync] Skipping large file (${(file.size / 1024 / 1024).toFixed(1)}MB): ${entry.path}`)
        continue
      }

      const content = file.textSync()
      const contentHash = await computeHash(content)

      localFiles.push({
        fileId: entry.id,
        path: entry.path,
        title: extractTitle(entry.path),
        size: file.size ?? 0,
        contentHash,
        vectorClock: entry.vectorClock,
      })
    } catch {
      // 文件可能已删除，跳过
    }
  }

  return localFiles
}
