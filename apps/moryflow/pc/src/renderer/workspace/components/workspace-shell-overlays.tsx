/**
 * [PROPS]: 无（通过 workspace-shell-view-store selector 取数）
 * [EMITS]: onSettingsOpenChange(open), onCommandOpenChange(open), onInputDialogConfirm(), onInputDialogCancel()
 * [POS]: DesktopWorkspaceShell 覆层层（Command/Input/Settings）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { lazy, Suspense } from 'react';
import type {
  MemorySearchFactItem,
  MemorySearchFileItem,
  SearchFileHit,
  SearchThreadHit,
} from '@shared/ipc';
import { useChatSessions } from '@/components/chat-pane/hooks';
import { GlobalSearchPanel } from '@/components/global-search';
import { InputDialog } from '@/components/input-dialog';
import { useWorkspaceNav, useWorkspaceTree } from '../context';
import { createAgentActions } from '../navigation/agent-actions';
import { useWorkspaceShellViewStore } from '../stores/workspace-shell-view-store';
import { toMemorySearchFileNode } from './memory/helpers';
import { useMemoryStore } from './memory';
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
  const openMemoryFact = useMemoryStore((state) => state.openFactFromSearch);

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

  const openMemoryFileFromSearch = (hit: MemorySearchFileItem) => {
    if (hit.disabled) {
      return;
    }
    const node = toMemorySearchFileNode(hit);
    if (!node) {
      return;
    }
    agentActions.openFile(node);
  };

  const openMemoryFactFromSearch = (hit: MemorySearchFactItem) => {
    openMemoryFact(hit.id, vaultPath ?? '__memory-no-vault__');
    go('memory');
  };

  return (
    <>
      <GlobalSearchPanel
        open={commandOpen}
        onOpenChange={onCommandOpenChange}
        onOpenFile={openFileFromSearch}
        onOpenThread={openThreadFromSearch}
        onOpenMemoryFile={openMemoryFileFromSearch}
        onOpenMemoryFact={openMemoryFactFromSearch}
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
