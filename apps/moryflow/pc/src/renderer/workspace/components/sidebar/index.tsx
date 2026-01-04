/**
 * [PROPS]: SidebarProps - 侧边栏完整 props
 * [EMITS]: 各类交互事件
 * [POS]: 侧边栏主组件，整合 Nav、Files、Tools、SearchDialog
 */

import { useCallback, useState } from 'react'
import type { VaultTreeNode } from '@shared/ipc'
import { ScrollArea } from '@aiget/ui/components/scroll-area'
import { TooltipProvider } from '@aiget/ui/components/tooltip'
import { PublishDialog } from '@/components/site-publish'
import { SidebarNav } from './components/sidebar-nav'
import { SidebarFiles } from './components/sidebar-files'
import { SidebarTools } from './components/sidebar-tools'
import { VaultSelector } from './components/vault-selector'
import { SearchDialog } from './components/search-dialog'
import type { SidebarProps } from './const'

export const Sidebar = ({
  vault,
  tree,
  expandedPaths,
  treeState,
  treeError,
  selectedId,
  onSettingsOpen,
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
  onOpenAITab,
  onOpenSites,
}: SidebarProps) => {
  // 搜索对话框状态
  const [searchOpen, setSearchOpen] = useState(false)

  // 发布对话框状态
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishSourcePaths, setPublishSourcePaths] = useState<string[]>([])
  const [publishTitle, setPublishTitle] = useState<string | undefined>()

  const handlePublish = useCallback((node: VaultTreeNode) => {
    setPublishSourcePaths([node.path])
    setPublishTitle(node.name.replace(/\.md$/, ''))
    setPublishDialogOpen(true)
  }, [])

  // 打开搜索对话框
  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true)
  }, [])

  // 搜索选择文件
  const handleSearchSelect = useCallback(
    (node: VaultTreeNode) => {
      onOpenFile(node)
    },
    [onOpenFile]
  )

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-muted/30">
        {/* 功能导航区：搜索、AI、Sites（固定不滚动） */}
        <div className="shrink-0">
          <SidebarNav onSearch={handleOpenSearch} onOpenAI={onOpenAITab} onSites={onOpenSites} />
        </div>

        {/* 分隔线 */}
        <div className="mx-2 shrink-0 border-t border-border/40" />

        {/* 文件列表区（独立滚动） */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* 工作区选择器（固定在文件区顶部） */}
          <div className="shrink-0 px-2 py-1">
            <VaultSelector
              onCreateFile={onCreateFileInRoot}
              onCreateFolder={onCreateFolderInRoot}
            />
          </div>

          {/* 文件树（可滚动） */}
          <ScrollArea className="min-h-0 flex-1">
            <SidebarFiles
              vault={vault}
              tree={tree}
              expandedPaths={expandedPaths}
              treeState={treeState}
              treeError={treeError}
              selectedId={selectedId}
              onSelectNode={onSelectNode}
              onExpandedPathsChange={onExpandedPathsChange}
              onOpenFile={onOpenFile}
              onRename={onRename}
              onDelete={onDelete}
              onCreateFile={onCreateFile}
              onShowInFinder={onShowInFinder}
              onMove={onMove}
              onCreateFileInRoot={onCreateFileInRoot}
              onCreateFolderInRoot={onCreateFolderInRoot}
              onPublish={handlePublish}
            />
          </ScrollArea>
        </div>

        {/* 分隔线 */}
        <div className="mx-2 shrink-0 border-t border-border/40" />

        {/* 工具区（固定在底部） */}
        <div className="shrink-0">
          <SidebarTools
            vault={vault}
            onSettingsOpen={onSettingsOpen}
          />
        </div>

        {/* 搜索对话框 */}
        <SearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          tree={tree}
          onSelectFile={handleSearchSelect}
        />

        {/* 发布对话框 */}
        <PublishDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          sourcePaths={publishSourcePaths}
          title={publishTitle}
        />
      </aside>
    </TooltipProvider>
  )
}

export type { SidebarProps } from './const'
