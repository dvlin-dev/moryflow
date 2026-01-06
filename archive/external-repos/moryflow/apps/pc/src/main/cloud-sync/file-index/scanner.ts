/**
 * FileIndex - 目录扫描
 * 单一职责：递归扫描目录，返回 md 文件列表
 */

import path from 'node:path'
import { readdir } from 'node:fs/promises'

/** 递归扫描目录，返回所有 md 文件的相对路径 */
export const scanMdFiles = async (
  vaultPath: string,
  relativePath = ''
): Promise<string[]> => {
  const results: string[] = []
  const fullPath = relativePath ? path.join(vaultPath, relativePath) : vaultPath

  let entries
  try {
    entries = await readdir(fullPath, { withFileTypes: true })
  } catch (error) {
    // 目录不存在或无权限，静默跳过
    console.warn('[FileIndex] Failed to read directory:', fullPath, error)
    return results
  }

  for (const entry of entries) {
    // 跳过隐藏文件/目录
    if (entry.name.startsWith('.')) continue

    const entryRelativePath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name

    if (entry.isDirectory()) {
      const subFiles = await scanMdFiles(vaultPath, entryRelativePath)
      results.push(...subFiles)
    } else if (entry.name.endsWith('.md')) {
      results.push(entryRelativePath)
    }
  }

  return results
}
