/**
 * [PROVIDES]: sortNodes, FILE_MENU_ITEMS, FOLDER_MENU_ITEMS, drag/drop utilities
 * [DEPENDS]: VaultTreeNode, ContextMenuItem types
 * [POS]: 文件树操作的纯函数工具集
 */

import { Edit2, ExternalLink, FileText, Globe, Trash2 } from 'lucide-react'
import type { VaultTreeNode } from '@shared/ipc'
import type { ContextMenuItem, DragData, DropValidation } from './const'

// 节点排序：文件夹优先，同类型按中文排序
export const sortNodes = (nodes: VaultTreeNode[]): VaultTreeNode[] =>
  [...nodes].sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name, 'zh-CN')
    }
    return a.type === 'folder' ? -1 : 1
  })

// 文件右键菜单配置（labelKey 对应 i18n key）
export const FILE_MENU_ITEMS: ContextMenuItem[] = [
  { action: 'rename', labelKey: 'renameMenu', icon: Edit2 },
  { action: 'showInFinder', labelKey: 'showInFinderMac', icon: ExternalLink },
  { action: 'publish', labelKey: 'publishMenu', icon: Globe },
  { action: 'delete', labelKey: 'deleteMenu', icon: Trash2, dangerous: true },
]

// 文件夹右键菜单配置
export const FOLDER_MENU_ITEMS: ContextMenuItem[] = [
  { action: 'rename', labelKey: 'renameMenu', icon: Edit2 },
  { action: 'createFile', labelKey: 'newFileMenu', icon: FileText },
  { action: 'showInFinder', labelKey: 'showInFinderMac', icon: ExternalLink },
  { action: 'publish', labelKey: 'publishMenu', icon: Globe },
  { action: 'delete', labelKey: 'deleteMenu', icon: Trash2, dangerous: true },
]

// 创建拖拽数据
export const createDragData = (node: VaultTreeNode): DragData => ({
  nodeId: node.id,
  nodePath: node.path,
  nodeType: node.type,
  nodeName: node.name,
})

// 解析拖拽数据（仅在 drop 事件中有效）
export const parseDragData = (dataTransfer: DataTransfer): DragData | null => {
  try {
    const jsonStr = dataTransfer.getData('application/json')
    if (!jsonStr) return null
    return JSON.parse(jsonStr) as DragData
  } catch {
    return null
  }
}

// 检查是否是有效的拖拽（可在 dragOver 中使用，因为 types 在 dragOver 中可访问）
export const isValidDrag = (dataTransfer: DataTransfer): boolean => {
  return dataTransfer.types.includes('application/json')
}

// 验证是否可以放置（返回 i18n key 作为错误原因）
export const validateDrop = (dragData: DragData, targetNode: VaultTreeNode): DropValidation => {
  if (targetNode.type !== 'folder') {
    return { canDrop: false, reasonKey: 'onlyMoveToFolder' }
  }
  if (dragData.nodeId === targetNode.id) {
    return { canDrop: false, reasonKey: 'cannotMoveToSelf' }
  }
  if (dragData.nodeType === 'folder' && targetNode.path.startsWith(dragData.nodePath + '/')) {
    return { canDrop: false, reasonKey: 'cannotMoveToSubfolder' }
  }
  return { canDrop: true }
}
