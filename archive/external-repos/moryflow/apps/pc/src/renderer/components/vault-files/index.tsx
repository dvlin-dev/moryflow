/**
 * [PROPS]: VaultFilesProps - 文件树数据和操作回调
 * [EMITS]: 多个回调用于文件/文件夹操作
 * [POS]: 文件树根组件，管理拖拽状态和 Context
 */

import { useState, useMemo, type DragEvent } from 'react'
import { FilePlus } from 'lucide-react'
import { Files, FilesHighlight } from '@moryflow/ui/animate/primitives/base/files'
import { Button } from '@moryflow/ui/components/button'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { ROOT_DROP_TARGET_ID, type VaultFilesProps } from './const'
import { VaultFilesProvider } from './context'
import { isValidDrag, parseDragData, sortNodes } from './handle'
import { VaultFolder } from './components/vault-folder'
import { VaultFile } from './components/vault-file'

export const VaultFiles = ({
  nodes,
  vaultPath,
  selectedId = null,
  expandedPaths = [],
  onExpandedPathsChange,
  onSelectFile,
  onSelectNode,
  onRename,
  onDelete,
  onCreateFile,
  onShowInFinder,
  onPublish,
  onMove,
  onCreateFileInRoot,
}: VaultFilesProps) => {
  const { t } = useTranslation('workspace')
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  const sortedNodes = useMemo(() => sortNodes(nodes), [nodes])
  const isRootDropTarget = dropTargetId === ROOT_DROP_TARGET_ID

  // 容器的拖拽处理 - 用于拖拽到空白处时移动到根目录
  const handleContainerDragOver = (e: DragEvent) => {
    // 只有当事件目标是容器本身时才处理（而不是子元素冒泡上来的）
    if (e.target !== e.currentTarget) return
    e.preventDefault()
    // 在 dragOver 中使用 isValidDrag 检查（因为 getData 在 dragOver 中返回空）
    if (!isValidDrag(e.dataTransfer) || !vaultPath) return
    e.dataTransfer.dropEffect = 'move'
    if (dropTargetId !== ROOT_DROP_TARGET_ID) {
      setDropTargetId(ROOT_DROP_TARGET_ID)
    }
  }

  const handleContainerDrop = async (e: DragEvent) => {
    if (e.target !== e.currentTarget) return
    e.preventDefault()
    const dragData = parseDragData(e.dataTransfer)
    if (!dragData || !vaultPath) return

    try {
      await onMove?.(dragData.nodePath, vaultPath)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('moveFailed'))
    } finally {
      setDraggedNodeId(null)
      setDropTargetId(null)
    }
  }

  const handleContainerDragLeave = (e: DragEvent) => {
    // 只有当离开容器本身时才清除
    if (e.target === e.currentTarget) {
      setDropTargetId(null)
    }
  }

  const contextValue = useMemo(
    () => ({
      selectedId,
      onSelectFile,
      onSelectNode,
      onRename,
      onDelete,
      onCreateFile,
      onShowInFinder,
      onPublish,
      onMove,
      draggedNodeId,
      setDraggedNodeId,
      dropTargetId,
      setDropTargetId,
    }),
    [
      selectedId,
      onSelectFile,
      onSelectNode,
      onRename,
      onDelete,
      onCreateFile,
      onShowInFinder,
      onPublish,
      onMove,
      draggedNodeId,
      dropTargetId,
    ]
  )

  if (!nodes.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">{t('startWriting')}</p>
        <Button variant="outline" size="sm" onClick={onCreateFileInRoot}>
          <FilePlus className="mr-2 size-4" />
          {t('newNote')}
        </Button>
      </div>
    )
  }

  return (
    <VaultFilesProvider value={contextValue}>
      <div
        className={cn(
          'min-h-full w-full overflow-hidden',
          isRootDropTarget && 'bg-foreground/5 rounded-lg'
        )}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        onDragLeave={handleContainerDragLeave}
      >
        <Files
          className="w-full min-w-0"
          defaultOpen={expandedPaths}
          open={expandedPaths}
          onOpenChange={onExpandedPathsChange}
        >
          <FilesHighlight className="bg-accent rounded-md pointer-events-none">
            {sortedNodes.map((node) =>
              node.type === 'folder' ? (
                <VaultFolder key={node.id} node={node} />
              ) : (
                <VaultFile key={node.id} node={node} />
              )
            )}
          </FilesHighlight>
        </Files>
      </div>
    </VaultFilesProvider>
  )
}

export type { VaultFilesProps } from './const'
