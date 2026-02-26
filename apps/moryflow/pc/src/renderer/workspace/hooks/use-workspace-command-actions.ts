/**
 * [PROVIDES]: useWorkspaceCommandActions - 命令面板动作装配
 * [DEPENDS]: workspace actions + i18n
 * [POS]: 把 CommandPalette 动作构建从 handle.ts 拆出，避免控制器职责过载
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo } from 'react';
import type { VaultInfo, VaultTreeNode } from '@shared/ipc';
import type { CommandAction } from '@/components/command-palette/const';

type Translate = (key: string, params?: Record<string, unknown>) => string;

type UseWorkspaceCommandActionsOptions = {
  vault: VaultInfo | null;
  selectedEntry: VaultTreeNode | null;
  t: Translate;
  onVaultOpen: () => void | Promise<void>;
  onRefreshTree: () => void;
  onCreateFile: () => void | Promise<void>;
  onCreateFolder: () => void | Promise<void>;
  onRenameEntry: () => void | Promise<void>;
  onDeleteEntry: () => void | Promise<void>;
  onShowInFinder: (path: string) => void | Promise<void>;
};

export const useWorkspaceCommandActions = ({
  vault,
  selectedEntry,
  t,
  onVaultOpen,
  onRefreshTree,
  onCreateFile,
  onCreateFolder,
  onRenameEntry,
  onDeleteEntry,
  onShowInFinder,
}: UseWorkspaceCommandActionsOptions): CommandAction[] => {
  return useMemo<CommandAction[]>(
    () => [
      {
        id: 'vault:open',
        label: vault ? t('switchVault') : t('selectVault'),
        description: vault ? t('currentVault', { path: vault.path }) : t('openFolderAsVault'),
        shortcut: '⌘O',
        handler: () => void onVaultOpen(),
      },
      {
        id: 'vault:refresh',
        label: t('refreshFileTree'),
        description: t('rescanMarkdownFiles'),
        shortcut: '⌘R',
        disabled: !vault,
        handler: onRefreshTree,
      },
      {
        id: 'files:new-markdown',
        label: t('newMarkdownFile'),
        description: t('createNoteInDir'),
        shortcut: '⌘N',
        disabled: !vault,
        handler: () => void onCreateFile(),
      },
      {
        id: 'files:new-folder',
        label: t('createFolderTitle'),
        description: t('createSubfolder'),
        disabled: !vault,
        handler: () => void onCreateFolder(),
      },
      {
        id: 'files:rename',
        label: t('renameFileOrFolder'),
        description: t('renameCurrentSelection'),
        disabled: !selectedEntry,
        handler: () => void onRenameEntry(),
      },
      {
        id: 'files:delete',
        label: t('deleteFileOrFolder'),
        description: t('deleteCurrentSelection'),
        disabled: !selectedEntry,
        handler: () => void onDeleteEntry(),
      },
      {
        id: 'vault:show-in-finder',
        label: t('showInFinder'),
        description: t('locateInFileManager'),
        disabled: !selectedEntry,
        handler: () => {
          if (selectedEntry) {
            void onShowInFinder(selectedEntry.path);
          }
        },
      },
    ],
    [
      vault,
      selectedEntry,
      t,
      onVaultOpen,
      onRefreshTree,
      onCreateFile,
      onCreateFolder,
      onRenameEntry,
      onDeleteEntry,
      onShowInFinder,
    ]
  );
};
