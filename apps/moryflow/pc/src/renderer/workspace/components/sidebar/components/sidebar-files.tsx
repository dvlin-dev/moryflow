/**
 * [PROPS]: SidebarFilesProps - 文件树相关 props
 * [EMITS]: 文件操作事件（选择、打开、重命名、删除等）
 * [POS]: 侧边栏文件列表区组件
 */

import { FilePlus, FolderPlus } from 'lucide-react'
import type { VaultTreeNode } from '@shared/ipc'
import { Alert, AlertDescription } from '@aiget/ui/components/alert'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@aiget/ui/components/context-menu'
import { Skeleton } from '@aiget/ui/components/skeleton'
import { VaultFiles } from '@/components/vault-files'
import { useTranslation } from '@/lib/i18n'
import type { SidebarFilesProps } from '../const'

const LoadingPlaceholder = () => (
  <div className="space-y-2 px-3 pt-3">
    {[...Array(6)].map((_, index) => (
      <Skeleton key={index} className="h-4 w-full bg-muted/40" />
    ))}
  </div>
)

export const SidebarFiles = ({
  vault,
  tree,
  expandedPaths,
  treeState,
  treeError,
  selectedId,
  onSelectNode,
  onExpandedPathsChange,
  onOpenFile,
  onRename,
  onDelete,
  onCreateFile,
  onShowInFinder,
  onMove,
  onCreateFileInRoot,
  onCreateFolderInRoot,
  onPublish,
}: SidebarFilesProps) => {
  const { t } = useTranslation('workspace')

  if (treeState === 'loading') {
    return <LoadingPlaceholder />
  }

  if (treeState === 'error') {
    return (
      <Alert variant="destructive" className="m-3">
        <AlertDescription>{treeError}</AlertDescription>
      </Alert>
    )
  }

  if (treeState !== 'idle') {
    return null
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="h-full overflow-hidden px-2.5 py-1">
          <VaultFiles
            nodes={tree}
            vaultPath={vault?.path}
            expandedPaths={expandedPaths}
            selectedId={selectedId}
            onExpandedPathsChange={onExpandedPathsChange}
            onSelectFile={onOpenFile}
            onSelectNode={onSelectNode}
            onRename={onRename}
            onDelete={onDelete}
            onCreateFile={onCreateFile}
            onShowInFinder={onShowInFinder}
            onPublish={onPublish}
            onMove={onMove}
            onCreateFileInRoot={onCreateFileInRoot}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onCreateFileInRoot}>
          <FilePlus className="mr-2 h-4 w-4" />
          {t('newNote')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onCreateFolderInRoot}>
          <FolderPlus className="mr-2 h-4 w-4" />
          {t('newFolder')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
