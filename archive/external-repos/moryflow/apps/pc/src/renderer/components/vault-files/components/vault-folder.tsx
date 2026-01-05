/**
 * [PROPS]: { node } - 文件夹节点数据
 * [EMITS]: 通过 context 触发选择、重命名、删除、移动等操作
 * [POS]: 文件树中的文件夹节点组件，支持拖拽和右键菜单
 */

import { useMemo, type DragEvent } from 'react'
import { FolderIcon, FolderOpenIcon } from 'lucide-react'
import { ContextMenu, ContextMenuTrigger } from '@moryflow/ui/components/context-menu'
import {
  FolderItem as FolderItemPrimitive,
  FolderHeader as FolderHeaderPrimitive,
  FolderTrigger as FolderTriggerPrimitive,
  FolderHighlight as FolderHighlightPrimitive,
  Folder as FolderPrimitive,
  FolderIcon as FolderIconPrimitive,
  FileLabel as FileLabelPrimitive,
  FolderPanel as FolderPanelPrimitive,
} from '@moryflow/ui/animate/primitives/base/files'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { VaultTreeNode } from '@shared/ipc'
import type { ContextMenuAction } from '../const'
import { useVaultFiles } from '../context'
import { createDragData, FOLDER_MENU_ITEMS, isValidDrag, parseDragData, sortNodes, validateDrop } from '../handle'
import { NodeContextMenu } from './node-context-menu'
import { VaultFile } from './vault-file'

type VaultFolderProps = {
  node: VaultTreeNode
}

export const VaultFolder = ({ node }: VaultFolderProps) => {
  const { t } = useTranslation('workspace')
  const {
    selectedId,
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
  } = useVaultFiles()

  const isSelected = selectedId === node.id
  const isDragging = draggedNodeId === node.id
  const isDropTarget = dropTargetId === node.id
  const hasChildren = node.hasChildren ?? Boolean(node.children?.length)

  // memo 避免每次渲染都重新排序
  const sortedChildren = useMemo(
    () => (node.children ? sortNodes(node.children) : []),
    [node.children]
  )

  const handleClick = () => {
    onSelectNode?.(node)
  }

  const handleMenuAction = (action: ContextMenuAction) => {
    const actions: Partial<Record<ContextMenuAction, () => void>> = {
      rename: () => onRename?.(node),
      delete: () => onDelete?.(node),
      createFile: () => onCreateFile?.(node),
      showInFinder: () => onShowInFinder?.(node),
      publish: () => onPublish?.(node),
    }
    actions[action]?.()
  }

  const handleDragStart = (e: DragEvent) => {
    e.stopPropagation()
    const dragData = createDragData(node)
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'
    setDraggedNodeId(node.id)
  }

  const handleDragEnd = () => {
    setDraggedNodeId(null)
    setDropTargetId(null)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 在 dragOver 中使用 isValidDrag 检查（因为 getData 在 dragOver 中返回空）
    if (!isValidDrag(e.dataTransfer)) return
    e.dataTransfer.dropEffect = 'move'
    // 持续更新 dropTargetId
    if (dropTargetId !== node.id) {
      setDropTargetId(node.id)
    }
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dragData = parseDragData(e.dataTransfer)
    if (!dragData) return

    const validation = validateDrop(dragData, node)
    if (!validation.canDrop) {
      const errorKey = (validation.reasonKey ?? 'cannotMoveHere') as Parameters<typeof t>[0]
      window.alert(t(errorKey))
      setDraggedNodeId(null)
      setDropTargetId(null)
      return
    }

    try {
      await onMove?.(dragData.nodePath, node.path)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('moveFailed'))
    } finally {
      setDraggedNodeId(null)
      setDropTargetId(null)
    }
  }

  return (
    <FolderItemPrimitive value={node.path} className="w-full min-w-0">
      <FolderHeaderPrimitive className="w-full min-w-0">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={cn('w-full min-w-0 cursor-pointer select-none', isDragging && 'opacity-50')}
            >
              <FolderTriggerPrimitive className="w-full min-w-0 text-start" onClick={handleClick}>
                <FolderHighlightPrimitive className="w-full min-w-0 overflow-hidden">
                  <FolderPrimitive
                    className={cn(
                      'flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 pl-[18px] pr-2 pointer-events-none',
                      isSelected && 'bg-accent',
                      isDropTarget && 'bg-foreground/10 border border-primary/50'
                    )}
                  >
                    <FolderIconPrimitive
                      className="shrink-0"
                      closeIcon={<FolderIcon className="size-4 text-muted-foreground" />}
                      openIcon={<FolderOpenIcon className="size-4 text-muted-foreground" />}
                    />
                    <FileLabelPrimitive className="min-w-0 flex-1 truncate text-sm font-medium">
                      {node.name}
                    </FileLabelPrimitive>
                  </FolderPrimitive>
                </FolderHighlightPrimitive>
              </FolderTriggerPrimitive>
            </div>
          </ContextMenuTrigger>
          <NodeContextMenu items={FOLDER_MENU_ITEMS} onAction={handleMenuAction} />
        </ContextMenu>
      </FolderHeaderPrimitive>

      {hasChildren && (
        <FolderPanelPrimitive className="w-full min-w-0 overflow-hidden">
          <div className="relative ml-4 min-w-0 overflow-hidden pl-2 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-border">
            {sortedChildren.map((child) =>
              child.type === 'folder' ? (
                <VaultFolder key={child.id} node={child} />
              ) : (
                <VaultFile key={child.id} node={child} />
              )
            )}
          </div>
        </FolderPanelPrimitive>
      )}
    </FolderItemPrimitive>
  )
}
