import { useCallback } from 'react'
import type { VaultTreeNode } from '@shared/ipc'

import { ensureMarkdownExtension, resolveParentPath, sanitizeEntryName } from '../../utils'
import type { TranslateFunction, UseVaultFileOperationsOptions, VaultGuard } from '../types'

type CreateFileDeps = Pick<
  UseVaultFileOperationsOptions,
  | 'vault'
  | 'selectedEntry'
  | 'fetchTree'
  | 'setPendingSelectionPath'
  | 'setPendingOpenPath'
  | 'showInputDialog'
> & { ensureVaultSelected: VaultGuard; t: TranslateFunction }

type CreateFileOptions = {
  /** 为 true 时强制在根目录创建 */
  forceRoot?: boolean
  /** 指定目标节点（优先级高于 selectedEntry） */
  targetNode?: VaultTreeNode
}

/**
 * 新建 Markdown 文件，名称校验与状态更新集中在此处。
 */
export const useCreateFile = ({
  t,
  ensureVaultSelected,
  vault,
  selectedEntry,
  fetchTree,
  setPendingSelectionPath,
  setPendingOpenPath,
  showInputDialog,
}: CreateFileDeps) =>
  useCallback(async (options?: CreateFileOptions) => {
    if (!ensureVaultSelected()) {
      return
    }
    const input = await showInputDialog({
      title: t('createFileTitle'),
      description: t('enterFileName'),
      placeholder: t('fileNamePlaceholder'),
    })
    if (input === null) {
      return
    }
    const sanitized = sanitizeEntryName(input)
    if (!sanitized) {
      window.alert(t('invalidFileName'))
      return
    }
    // 优先使用 targetNode，其次使用 selectedEntry，forceRoot 时使用 null
    const targetEntry = options?.forceRoot ? null : (options?.targetNode ?? selectedEntry)
    const parentPath = resolveParentPath(vault, targetEntry) || vault!.path
    try {
      const result = await window.desktopAPI.files.createFile({
        parentPath,
        name: ensureMarkdownExtension(sanitized),
      })
      setPendingSelectionPath(result.path)
      setPendingOpenPath(result.path)
      await fetchTree(vault!.path)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('createFileFailed'))
    }
  }, [
    t,
    ensureVaultSelected,
    vault,
    selectedEntry,
    fetchTree,
    setPendingSelectionPath,
    setPendingOpenPath,
    showInputDialog,
  ])
