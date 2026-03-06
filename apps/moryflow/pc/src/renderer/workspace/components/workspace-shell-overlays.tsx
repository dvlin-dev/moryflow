/**
 * [PROPS]: 无（通过 workspace-shell-view-store selector 取数）
 * [EMITS]: onSettingsOpenChange(open), onCommandOpenChange(open), onInputDialogConfirm(), onInputDialogCancel()
 * [POS]: DesktopWorkspaceShell 覆层层（Command/Input/Settings）
 * [UPDATE]: 2026-03-01 - 搜索命中文件打开改为复用独立映射器，确保树节点 id 语义与文件树一致
 * [UPDATE]: 2026-02-26 - 改为从 workspace-shell-view-store 就地取数，移除上层 props 平铺
 * [UPDATE]: 2026-02-26 - 移除对象字面量 selector，改为原子 selector，避免 zustand v5 快照引用抖动
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { lazy, Suspense } from 'react';
import type { SearchFileHit, SearchThreadHit } from '@shared/ipc';
import { useChatSessions } from '@/components/chat-pane/hooks';
import { GlobalSearchPanel } from '@/components/global-search';
import { InputDialog } from '@/components/input-dialog';
import { useWorkspaceNav, useWorkspaceTree } from '../context';
import { createAgentActions } from '../navigation/agent-actions';
import { useWorkspaceShellViewStore } from '../stores/workspace-shell-view-store';
import { toSearchHitFileNode } from './workspace-shell-overlays-handle';

const SettingsDialog = lazy(() =>
  import('@/components/settings-dialog').then((mod) => ({ default: mod.SettingsDialog }))
);

export const WorkspaceShellOverlays = () => {
  const commandOpen = useWorkspaceShellViewStore((state) => state.commandOpen);
  const onCommandOpenChange = useWorkspaceShellViewStore((state) => state.onCommandOpenChange);
  const inputDialogState = useWorkspaceShellViewStore((state) => state.inputDialogState);
  const onInputDialogConfirm = useWorkspaceShellViewStore((state) => state.onInputDialogConfirm);
  const onInputDialogCancel = useWorkspaceShellViewStore((state) => state.onInputDialogCancel);
  const settingsOpen = useWorkspaceShellViewStore((state) => state.settingsOpen);
  const settingsSection = useWorkspaceShellViewStore((state) => state.settingsSection);
  const onSettingsOpenChange = useWorkspaceShellViewStore((state) => state.onSettingsOpenChange);
  const vaultPath = useWorkspaceShellViewStore((state) => state.vaultPath || undefined);
  const { go, setSidebarMode } = useWorkspaceNav();
  const { openFileFromTree } = useWorkspaceTree();
  const { selectSession } = useChatSessions();

  const agentActions = createAgentActions({
    goToAgent: () => go('agent'),
    setSidebarMode,
    selectThread: selectSession,
    openFile: openFileFromTree,
  });

  const openFileFromSearch = (hit: SearchFileHit) => {
    const node = toSearchHitFileNode(hit);
    if (!node) {
      return;
    }
    agentActions.openFile(node);
  };

  const openThreadFromSearch = (hit: SearchThreadHit) => {
    if (!hit.sessionId) {
      return;
    }
    agentActions.openThread(hit.sessionId);
  };

  return (
    <>
      <GlobalSearchPanel
        open={commandOpen}
        onOpenChange={onCommandOpenChange}
        onOpenFile={openFileFromSearch}
        onOpenThread={openThreadFromSearch}
      />
      <InputDialog
        open={inputDialogState.open}
        title={inputDialogState.title}
        description={inputDialogState.description}
        defaultValue={inputDialogState.defaultValue}
        placeholder={inputDialogState.placeholder}
        onConfirm={onInputDialogConfirm}
        onCancel={onInputDialogCancel}
      />
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsDialog
            open={settingsOpen}
            onOpenChange={onSettingsOpenChange}
            initialSection={settingsSection}
            vaultPath={vaultPath}
          />
        </Suspense>
      )}
    </>
  );
};
