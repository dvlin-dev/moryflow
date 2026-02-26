/**
 * [PROPS]: 无（通过 workspace-shell-view-store selector 取数）
 * [EMITS]: onSettingsOpenChange(open), onCommandOpenChange(open), onInputDialogConfirm(), onInputDialogCancel()
 * [POS]: DesktopWorkspaceShell 覆层层（Command/Input/Settings）
 * [UPDATE]: 2026-02-26 - 改为从 workspace-shell-view-store 就地取数，移除上层 props 平铺
 * [UPDATE]: 2026-02-26 - 移除对象字面量 selector，改为原子 selector，避免 zustand v5 快照引用抖动
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { lazy, Suspense } from 'react';
import { CommandPalette } from '@/components/command-palette';
import { InputDialog } from '@/components/input-dialog';
import { useWorkspaceShellViewStore } from '../stores/workspace-shell-view-store';

const SettingsDialog = lazy(() =>
  import('@/components/settings-dialog').then((mod) => ({ default: mod.SettingsDialog }))
);

export const WorkspaceShellOverlays = () => {
  const commandOpen = useWorkspaceShellViewStore((state) => state.commandOpen);
  const onCommandOpenChange = useWorkspaceShellViewStore((state) => state.onCommandOpenChange);
  const commandActions = useWorkspaceShellViewStore((state) => state.commandActions);
  const inputDialogState = useWorkspaceShellViewStore((state) => state.inputDialogState);
  const onInputDialogConfirm = useWorkspaceShellViewStore((state) => state.onInputDialogConfirm);
  const onInputDialogCancel = useWorkspaceShellViewStore((state) => state.onInputDialogCancel);
  const settingsOpen = useWorkspaceShellViewStore((state) => state.settingsOpen);
  const settingsSection = useWorkspaceShellViewStore((state) => state.settingsSection);
  const onSettingsOpenChange = useWorkspaceShellViewStore((state) => state.onSettingsOpenChange);
  const vaultPath = useWorkspaceShellViewStore((state) => state.vaultPath || undefined);

  return (
    <>
      <CommandPalette
        open={commandOpen}
        onOpenChange={onCommandOpenChange}
        actions={commandActions}
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
