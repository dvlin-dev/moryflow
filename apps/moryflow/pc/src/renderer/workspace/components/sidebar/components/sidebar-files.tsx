/**
 * [PROPS]: SidebarFilesProps - 文件树相关 props
 * [EMITS]: 文件操作事件（选择、打开、重命名、删除等）
 * [POS]: 侧边栏文件列表区组件（Lucide 图标）
 * [UPDATE]: 2026-02-11 - 横向间距收敛：移除外层容器额外 padding，保持左右对齐一致
 * [UPDATE]: 2026-02-11 - 由文件列表子容器统一控制 inset，和 Threads 列表保持一致的背景分层
 * [UPDATE]: 2026-02-11 - 文件列表 inset 改为复用 sidebar 常量（列表容器独立维护，不影响全局 gutter）
 */

import { memo } from 'react';
import { FilePlus, FolderPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@moryflow/ui/components/alert';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@moryflow/ui/components/context-menu';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import { VaultFiles } from '@/components/vault-files';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SIDEBAR_LIST_INSET_X_CLASS, type SidebarFilesProps } from '../const';

const LoadingPlaceholder = () => (
  <div className={cn('space-y-2 pt-3', SIDEBAR_LIST_INSET_X_CLASS)}>
    {[...Array(6)].map((_, index) => (
      <Skeleton key={index} className="h-4 w-full bg-muted/40" />
    ))}
  </div>
);

export const SidebarFiles = memo(function SidebarFiles({
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
}: SidebarFilesProps) {
  const { t } = useTranslation('workspace');

  if (treeState === 'loading') {
    return <LoadingPlaceholder />;
  }

  if (treeState === 'error') {
    return (
      <Alert variant="destructive" className="m-3">
        <AlertDescription>{treeError}</AlertDescription>
      </Alert>
    );
  }

  if (treeState !== 'idle') {
    return null;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={cn('h-full overflow-hidden py-1', SIDEBAR_LIST_INSET_X_CLASS)}>
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
  );
});

SidebarFiles.displayName = 'SidebarFiles';
