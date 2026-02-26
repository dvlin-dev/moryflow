/**
 * [PROPS]: 无（通过 workspace-shell-view-store selector 取数）
 * [EMITS]: onSettingsOpenChange(open), onCommandOpenChange(open), onInputDialogConfirm(), onInputDialogCancel()
 * [POS]: DesktopWorkspaceShell 覆层层（Command/Input/Settings）
 * [UPDATE]: 2026-02-26 - 改为从 workspace-shell-view-store 就地取数，移除上层 props 平铺
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
  const {
    commandOpen,
    onCommandOpenChange,
    commandActions,
    inputDialogState,
    onInputDialogConfirm,
    onInputDialogCancel,
    settingsOpen,
    settingsSection,
    onSettingsOpenChange,
    vaultPath,
  } = useWorkspaceShellViewStore((state) => ({
    commandOpen: state.commandOpen,
    onCommandOpenChange: state.onCommandOpenChange,
    commandActions: state.commandActions,
    inputDialogState: state.inputDialogState,
    onInputDialogConfirm: state.onInputDialogConfirm,
    onInputDialogCancel: state.onInputDialogCancel,
    settingsOpen: state.settingsOpen,
    settingsSection: state.settingsSection,
    onSettingsOpenChange: state.onSettingsOpenChange,
    vaultPath: state.vaultPath || undefined,
  }));

  return (
    <>
      <CommandPalette open={commandOpen} onOpenChange={onCommandOpenChange} actions={commandActions} />
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
