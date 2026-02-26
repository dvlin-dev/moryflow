/**
 * [PROPS]: 无（通过 sidebar-panels-store selector 取数）
 * [EMITS]: onOpenThread(), onSelectNode(), onOpenFile(), onExpandedPathsChange(), onRename(), onDelete(), onCreateFile(), onShowInFinder(), onMove(), onCreateFileInRoot(), onCreateFolderInRoot(), onPublish()
 * [POS]: Sidebar agent 子视图内容分发（Chat/Workspace keep-alive）
 * [UPDATE]: 2026-02-26 - 改为从 sidebar-panels-store 就地取数，移除上层 props 平铺
 * [UPDATE]: 2026-02-26 - 移除对象字面量 selector，改为原子 selector，避免 zustand v5 快照引用抖动
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useState } from 'react';
import { ChatThreadsList } from './chat-threads-list';
import { SidebarFiles } from './sidebar-files';
import { useSidebarPanelsStore } from '../hooks/use-sidebar-panels-store';

const getPanelClass = (active: boolean) => (active ? 'block' : 'hidden');

export const AgentSubPanels = () => {
  const agentSub = useSidebarPanelsStore((state) => state.agentSub);
  const vault = useSidebarPanelsStore((state) => state.vault);
  const tree = useSidebarPanelsStore((state) => state.tree);
  const expandedPaths = useSidebarPanelsStore((state) => state.expandedPaths);
  const treeState = useSidebarPanelsStore((state) => state.treeState);
  const treeError = useSidebarPanelsStore((state) => state.treeError);
  const selectedId = useSidebarPanelsStore((state) => state.selectedId);
  const onOpenThread = useSidebarPanelsStore((state) => state.onOpenThread);
  const onSelectNode = useSidebarPanelsStore((state) => state.onSelectNode);
  const onExpandedPathsChange = useSidebarPanelsStore((state) => state.onExpandedPathsChange);
  const onOpenFile = useSidebarPanelsStore((state) => state.onOpenFile);
  const onRename = useSidebarPanelsStore((state) => state.onRename);
  const onDelete = useSidebarPanelsStore((state) => state.onDelete);
  const onCreateFile = useSidebarPanelsStore((state) => state.onCreateFile);
  const onShowInFinder = useSidebarPanelsStore((state) => state.onShowInFinder);
  const onMove = useSidebarPanelsStore((state) => state.onMove);
  const onCreateFileInRoot = useSidebarPanelsStore((state) => state.onCreateFileInRoot);
  const onCreateFolderInRoot = useSidebarPanelsStore((state) => state.onCreateFolderInRoot);
  const onPublish = useSidebarPanelsStore((state) => state.onPublish);

  const [chatPaneMounted, setChatPaneMounted] = useState(agentSub === 'chat');
  const [workspacePaneMounted, setWorkspacePaneMounted] = useState(agentSub === 'workspace');

  useEffect(() => {
    if (agentSub === 'chat') {
      setChatPaneMounted(true);
    }
    if (agentSub === 'workspace') {
      setWorkspacePaneMounted(true);
    }
  }, [agentSub]);

  return (
    <>
      <div
        id="agent-sub-panel-chat"
        role="tabpanel"
        aria-labelledby="agent-sub-tab-chat"
        hidden={agentSub !== 'chat'}
        className={getPanelClass(agentSub === 'chat')}
      >
        {chatPaneMounted && <ChatThreadsList onOpenThread={onOpenThread} />}
      </div>

      <div
        id="agent-sub-panel-workspace"
        role="tabpanel"
        aria-labelledby="agent-sub-tab-workspace"
        hidden={agentSub !== 'workspace'}
        className={getPanelClass(agentSub === 'workspace')}
      >
        {workspacePaneMounted && (
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
            onPublish={onPublish}
          />
        )}
      </div>
    </>
  );
};
