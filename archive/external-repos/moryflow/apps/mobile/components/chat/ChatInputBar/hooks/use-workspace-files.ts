/**
 * [PROVIDES]: useWorkspaceFiles - 获取工作区所有文件
 * [DEPENDS]: useVault, fileIndexManager
 * [POS]: 获取并转换工作区文件列表为扁平结构
 */

import { useMemo } from 'react'
import { useVault } from '@/lib/vault/use-vault'
import { fileIndexManager } from '@/lib/vault/file-index'

/** 扁平化文件结构（用于搜索） */
export interface FlatFile {
  /** 唯一标识（fileId） */
  id: string
  /** 文件相对路径 */
  path: string
  /** 文件名（不含扩展名） */
  name: string
  /** 扩展名（小写） */
  extension: string
}

/**
 * 获取工作区所有文件
 * 从 fileIndexManager 获取数据并转换为 FlatFile[]
 */
export function useWorkspaceFiles(): FlatFile[] {
  const { vault } = useVault()

  return useMemo(() => {
    if (!vault?.path) return []

    const entries = fileIndexManager.getAll(vault.path)

    return entries.map((entry) => {
      const fileName = entry.path.split('/').pop() ?? entry.path
      const dotIndex = fileName.lastIndexOf('.')
      const name = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
      const extension = dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : ''

      return {
        id: entry.id,
        path: entry.path,
        name,
        extension,
      }
    })
  }, [vault?.path])
}
