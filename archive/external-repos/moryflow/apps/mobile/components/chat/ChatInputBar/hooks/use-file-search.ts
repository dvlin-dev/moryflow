/**
 * [PROVIDES]: useFileSearch - 文件模糊搜索
 * [DEPENDS]: FlatFile
 * [POS]: 对工作区文件列表进行模糊搜索过滤
 */

import { useState, useMemo, useCallback } from 'react'
import type { FlatFile } from './use-workspace-files'

interface UseFileSearchReturn {
  /** 搜索关键词 */
  query: string
  /** 设置搜索关键词 */
  setQuery: (query: string) => void
  /** 过滤后的文件列表 */
  filteredFiles: FlatFile[]
  /** 清空搜索 */
  clearQuery: () => void
}

/**
 * 模糊匹配文件名
 * 支持连续子串匹配（不区分大小写）
 */
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true
  return text.toLowerCase().includes(query.toLowerCase())
}

/**
 * 文件搜索 Hook
 * @param files 所有文件列表
 */
export function useFileSearch(files: FlatFile[]): UseFileSearchReturn {
  const [query, setQuery] = useState('')

  // 过滤文件
  const filteredFiles = useMemo(() => {
    if (!query.trim()) return files

    return files.filter((file) => {
      // 匹配文件名或路径
      return fuzzyMatch(file.name, query) || fuzzyMatch(file.path, query)
    })
  }, [files, query])

  // 清空搜索
  const clearQuery = useCallback(() => {
    setQuery('')
  }, [])

  return {
    query,
    setQuery,
    filteredFiles,
    clearQuery,
  }
}
