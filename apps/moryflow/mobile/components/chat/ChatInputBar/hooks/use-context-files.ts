/**
 * [PROVIDES]: useContextFiles - 管理选中文件状态
 * [DEPENDS]: FileRefAttachment, createFileRefAttachment
 * [POS]: 管理用户选中的上下文文件列表
 */

import { useState, useCallback } from 'react'
import type { FileRefAttachment } from '../types'
import { createFileRefAttachment } from '../types'
import type { FlatFile } from './use-workspace-files'

interface UseContextFilesReturn {
  /** 已选中的文件列表 */
  contextFiles: FileRefAttachment[]
  /** 添加文件到上下文 */
  addFile: (file: FlatFile) => void
  /** 从上下文移除文件 */
  removeFile: (fileId: string) => void
  /** 清空所有文件 */
  clearFiles: () => void
  /** 检查文件是否已选中 */
  isSelected: (fileId: string) => boolean
}

/**
 * 管理上下文文件选择状态
 */
export function useContextFiles(): UseContextFilesReturn {
  const [contextFiles, setContextFiles] = useState<FileRefAttachment[]>([])

  const addFile = useCallback((file: FlatFile) => {
    setContextFiles((prev) => {
      if (prev.some((f) => f.id === file.id)) return prev
      return [...prev, createFileRefAttachment(file)]
    })
  }, [])

  const removeFile = useCallback((fileId: string) => {
    setContextFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  const clearFiles = useCallback(() => {
    setContextFiles([])
  }, [])

  const isSelected = useCallback(
    (fileId: string) => contextFiles.some((f) => f.id === fileId),
    [contextFiles]
  )

  return {
    contextFiles,
    addFile,
    removeFile,
    clearFiles,
    isSelected,
  }
}
