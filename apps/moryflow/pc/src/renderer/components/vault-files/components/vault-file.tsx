/**
 * [PROPS]: { node } - 文件节点数据
 * [EMITS]: 通过 context 触发选择、重命名、删除等操作
 * [POS]: 文件树中的文件节点组件，支持拖拽和右键菜单
 */

import type { DragEvent } from 'react'
import { FileText } from 'lucide-react'
import { ContextMenu, ContextMenuTrigger } from '@anyhunt/ui/components/context-menu'
import {
  FileHighlight as FileHighlightPrimitive,
  File as FilePrimitive,
  FileIcon as FileIconPrimitive,
  FileLabel as FileLabelPrimitive,
} from '@anyhunt/ui/animate/primitives/base/files'
import { cn } from '@/lib/utils'
import type { VaultTreeNode } from '@shared/ipc'
import type { ContextMenuAction } from '../const'
import { useVaultFiles } from '../context'
import { createDragData, FILE_MENU_ITEMS } from '../handle'
import { NodeContextMenu } from './node-context-menu'

type VaultFileProps = {
  node: VaultTreeNode
}

export const VaultFile = ({ node }: VaultFileProps) => {
  const {
    selectedId,
    onSelectFile,
    onSelectNode,
    onRename,
    onDelete,
    onShowInFinder,
    onPublish,
    draggedNodeId,
    setDraggedNodeId,
  } = useVaultFiles()

  const isSelected = selectedId === node.id
  const isDragging = draggedNodeId === node.id

  const handleClick = () => {
    onSelectNode?.(node)
    onSelectFile?.(node)
  }

  const handleMenuAction = (action: ContextMenuAction) => {
    const actions: Partial<Record<ContextMenuAction, () => void>> = {
      rename: () => onRename?.(node),
      delete: () => onDelete?.(node),
      showInFinder: () => onShowInFinder?.(node),
      publish: () => onPublish?.(node),
    }
    actions[action]?.()
  }

  const handleDragStart = (e: DragEvent) => {
    const dragData = createDragData(node)
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'
    setDraggedNodeId(node.id)
  }

  const handleDragEnd = () => {
    setDraggedNodeId(null)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          className={cn('w-full min-w-0 cursor-pointer select-none', isDragging && 'opacity-50')}
        >
          <FileHighlightPrimitive className="w-full min-w-0 overflow-hidden">
            <FilePrimitive
              className={cn(
                'flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 pl-[18px] pr-2 pointer-events-none',
                isSelected && 'bg-accent'
              )}
            >
              <FileIconPrimitive className="shrink-0">
                <FileText className="size-4 text-muted-foreground" />
              </FileIconPrimitive>
              <FileLabelPrimitive className="min-w-0 flex-1 truncate text-sm">
                {node.name}
              </FileLabelPrimitive>
            </FilePrimitive>
          </FileHighlightPrimitive>
        </div>
      </ContextMenuTrigger>
      <NodeContextMenu items={FILE_MENU_ITEMS} onAction={handleMenuAction} />
    </ContextMenu>
  )
}
