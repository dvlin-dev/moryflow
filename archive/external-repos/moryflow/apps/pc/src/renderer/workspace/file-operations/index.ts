import { useTranslation } from '@/lib/i18n';
import type { UseVaultFileOperationsOptions } from './types';
import { useVaultGuard } from './guard';
import { useCreateFile } from './operations/create-file';
import { useCreateFolder } from './operations/create-folder';
import { useRenameEntry } from './operations/rename-entry';
import { useDeleteEntry } from './operations/delete-entry';
import { useShowInFinder } from './operations/show-in-finder';
import { useMoveByDrag } from './operations/move-by-drag';

/**
 * Vault 文件操作 Hook，将单一操作拆分为独立模块以提升可维护性。
 */
export const useVaultFileOperations = (options: UseVaultFileOperationsOptions) => {
  const {
    vault,
    selectedEntry,
    activeDoc,
    fetchTree,
    resetEditorState,
    setPendingSelectionPath,
    setPendingOpenPath,
    setOpenTabs,
    setSelectedEntry,
    showInputDialog,
  } = options;

  const { t } = useTranslation('workspace');

  const ensureVaultSelected = useVaultGuard(vault, t);

  const handleCreateFile = useCreateFile({
    t,
    ensureVaultSelected,
    vault,
    selectedEntry,
    fetchTree,
    setPendingSelectionPath,
    setPendingOpenPath,
    showInputDialog,
  });

  const handleCreateFolder = useCreateFolder({
    t,
    ensureVaultSelected,
    vault,
    selectedEntry,
    fetchTree,
    setPendingSelectionPath,
    showInputDialog,
  });

  const handleRenameEntry = useRenameEntry({
    t,
    ensureVaultSelected,
    vault,
    selectedEntry,
    fetchTree,
    setPendingSelectionPath,
    setPendingOpenPath,
    setOpenTabs,
    showInputDialog,
  });

  const handleDeleteEntry = useDeleteEntry({
    t,
    ensureVaultSelected,
    vault,
    selectedEntry,
    activeDoc,
    fetchTree,
    resetEditorState,
    setOpenTabs,
    setSelectedEntry,
  });

  const handleShowInFinder = useShowInFinder({ ensureVaultSelected, vault, t });

  const handleMoveByDrag = useMoveByDrag({
    t,
    ensureVaultSelected,
    vault,
    fetchTree,
    setPendingSelectionPath,
    setPendingOpenPath,
    setOpenTabs,
  });

  return {
    handleCreateFile,
    handleCreateFolder,
    handleRenameEntry,
    handleDeleteEntry,
    handleShowInFinder,
    handleMoveByDrag,
  };
};
