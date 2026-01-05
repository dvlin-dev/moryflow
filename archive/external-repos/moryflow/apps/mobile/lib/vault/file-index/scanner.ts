/**
 * FileIndex - 目录扫描
 * 单一职责：递归扫描目录，返回 md 文件列表
 */

import { Directory, Paths, File } from 'expo-file-system'

/** 递归扫描目录，返回所有 md 文件的相对路径 */
export const scanMdFiles = async (
  vaultPath: string,
  relativePath = ''
): Promise<string[]> => {
  const results: string[] = []
  const fullPath = relativePath ? Paths.join(vaultPath, relativePath) : vaultPath
  const dir = new Directory(fullPath)

  if (!dir.exists) return results

  try {
    const items = dir.list()

    for (const item of items) {
      // 跳过隐藏文件/目录
      if (item.name.startsWith('.')) continue

      const entryRelativePath = relativePath
        ? `${relativePath}/${item.name}`
        : item.name

      if (item instanceof Directory) {
        const subFiles = await scanMdFiles(vaultPath, entryRelativePath)
        results.push(...subFiles)
      } else if (item instanceof File && item.name.endsWith('.md')) {
        results.push(entryRelativePath)
      }
    }
  } catch (error) {
    // 目录不存在或无权限，静默跳过
    console.warn('[FileIndex] Failed to read directory:', fullPath, error)
  }

  return results
}
