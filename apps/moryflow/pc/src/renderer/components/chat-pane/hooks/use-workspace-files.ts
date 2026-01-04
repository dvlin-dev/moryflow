/**
 * [PROVIDES]: useWorkspaceFiles - 获取工作区所有文件的 hook
 * [DEPENDS]: flattenTreeToFiles, desktopAPI.vault.getTreeCache
 * [POS]: 为 FileContextAdder 提供工作区文件列表
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  flattenTreeToFiles,
  type FlatFile,
} from '@/workspace/utils'

/**
 * 获取工作区所有文件列表
 * @param vaultPath 工作区路径
 * @returns files - 扁平化的文件列表, refresh - 刷新文件列表
 */
export const useWorkspaceFiles = (vaultPath: string | null) => {
  const [files, setFiles] = useState<FlatFile[]>([])
  const abortRef = useRef(false)

  const fetchFiles = useCallback(async () => {
    if (!vaultPath) {
      setFiles([])
      return
    }

    try {
      const cache = await window.desktopAPI.vault.getTreeCache(vaultPath)
      // 检查是否已取消
      if (abortRef.current) return
      if (cache?.nodes) {
        setFiles(flattenTreeToFiles(cache.nodes))
      }
    } catch (error) {
      if (abortRef.current) return
      console.error('[useWorkspaceFiles] Failed to fetch tree cache:', error)
      setFiles([])
    }
  }, [vaultPath])

  useEffect(() => {
    abortRef.current = false
    fetchFiles()
    return () => {
      abortRef.current = true
    }
  }, [fetchFiles])

  return { files, refresh: fetchFiles }
}
