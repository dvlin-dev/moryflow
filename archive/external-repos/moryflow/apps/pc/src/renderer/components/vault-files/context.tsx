/**
 * [PROVIDES]: VaultFilesProvider, useVaultFiles
 * [DEPENDS]: VaultTreeNode
 * [POS]: 文件树组件的 Context，管理选中状态、拖拽状态和操作回调
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { VaultTreeNode } from '@shared/ipc'

type VaultFilesContextType = {
  selectedId: string | null
  onSelectFile?: (node: VaultTreeNode) => void
  onSelectNode?: (node: VaultTreeNode) => void
  onRename?: (node: VaultTreeNode) => void
  onDelete?: (node: VaultTreeNode) => void
  onCreateFile?: (node: VaultTreeNode) => void
  onShowInFinder?: (node: VaultTreeNode) => void
  onPublish?: (node: VaultTreeNode) => void
  onMove?: (sourcePath: string, targetDir: string) => void | Promise<void>
  // 拖拽状态
  draggedNodeId: string | null
  setDraggedNodeId: (id: string | null) => void
  dropTargetId: string | null
  setDropTargetId: (id: string | null) => void
}

const VaultFilesContext = createContext<VaultFilesContextType | null>(null)

export const useVaultFiles = () => {
  const context = useContext(VaultFilesContext)
  if (!context) {
    throw new Error('useVaultFiles must be used within VaultFilesProvider')
  }
  return context
}

type VaultFilesProviderProps = {
  value: VaultFilesContextType
  children: ReactNode
}

export const VaultFilesProvider = ({ value, children }: VaultFilesProviderProps) => (
  <VaultFilesContext.Provider value={value}>{children}</VaultFilesContext.Provider>
)
