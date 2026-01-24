/**
 * [PROPS]: VaultSelectorProps
 * [EMITS]: onVaultChange, onCreateFile, onCreateFolder
 * [POS]: Vault 选择器主组件，整合列表、操作和对话框
 */

import { useState, useCallback } from 'react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@anyhunt/ui/components/popover';
import { Icon } from '@anyhunt/ui/components/icon';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { Skeleton } from '@anyhunt/ui/components/skeleton';
import { useTranslation } from '@/lib/i18n';
import { useVaultManager } from '@/hooks/use-vault-manager';
import type { VaultItem } from '@shared/ipc';
import { VaultListItem } from './components/vault-list-item';
import { VaultListActions } from './components/vault-list-actions';
import { VaultRemoveDialog } from './components/vault-remove-dialog';
import { CreateMenu } from './components/create-menu';
import type { VaultSelectorProps } from './const';

export const VaultSelector = ({
  onVaultChange,
  onCreateFile,
  onCreateFolder,
}: VaultSelectorProps) => {
  const { t } = useTranslation('workspace');
  const {
    vaults,
    activeVault,
    isLoading,
    switchVault,
    openFolder,
    createVault,
    removeVault,
    renameVault,
    validateVaults,
  } = useVaultManager();

  // Popover 状态
  const [open, setOpen] = useState(false);

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // 创建状态
  const [isCreating, setIsCreating] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');

  // 移除确认状态
  const [vaultToRemove, setVaultToRemove] = useState<VaultItem | null>(null);

  // 重置所有临时状态
  const resetState = useCallback(() => {
    setEditingId(null);
    setEditName('');
    setIsCreating(false);
    setNewVaultName('');
  }, []);

  // 处理 Popover 开关
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        void validateVaults();
      } else {
        resetState();
      }
    },
    [validateVaults, resetState]
  );

  // 选择 Vault
  const handleSelect = useCallback(
    async (vault: VaultItem) => {
      if (vault.id === activeVault?.id) {
        setOpen(false);
        return;
      }
      try {
        await switchVault(vault.id);
        onVaultChange?.(vault);
        setOpen(false);
      } catch (error) {
        console.error('[VaultSelector] 切换 Vault 失败:', error);
        toast.error(t('switchFailed'));
      }
    },
    [activeVault?.id, switchVault, onVaultChange, t]
  );

  // 编辑相关
  const handleStartEdit = useCallback((vault: VaultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(vault.id);
    setEditName(vault.name);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await renameVault(editingId, editName.trim());
      setEditingId(null);
      toast.success(t('renamed'));
    } catch (error) {
      console.error('[VaultSelector] 重命名失败:', error);
      toast.error(t('renameFailed'));
    }
  }, [editingId, editName, renameVault, t]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName('');
  }, []);

  // 移除相关
  const handleRemoveClick = useCallback((vault: VaultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setVaultToRemove(vault);
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    if (!vaultToRemove) return;
    try {
      await removeVault(vaultToRemove.id);
      setVaultToRemove(null);
      toast.success(t('removedFromList'));
    } catch (error) {
      console.error('[VaultSelector] 移除 Vault 失败:', error);
      toast.error(t('removeFailed'));
      setVaultToRemove(null);
    }
  }, [vaultToRemove, removeVault, t]);

  // 创建相关
  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setNewVaultName('');
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewVaultName('');
  }, []);

  const handleConfirmCreate = useCallback(async () => {
    if (!newVaultName.trim()) {
      setIsCreating(false);
      return;
    }
    const parentPath = await window.desktopAPI?.vault?.selectDirectory?.();
    if (!parentPath) {
      setIsCreating(false);
      return;
    }
    try {
      await createVault(newVaultName.trim(), parentPath);
      setIsCreating(false);
      setNewVaultName('');
      setOpen(false);
      toast.success(t('vaultCreated'));
    } catch (error) {
      console.error('[VaultSelector] 创建 Vault 失败:', error);
      toast.error(t('createFailed'));
      setIsCreating(false);
    }
  }, [newVaultName, createVault, t]);

  // 打开已有文件夹
  const handleOpenFolder = useCallback(async () => {
    try {
      await openFolder();
      setOpen(false);
    } catch (error) {
      console.error('[VaultSelector] 打开文件夹失败:', error);
      toast.error(t('openFolderFailed'));
    }
  }, [openFolder, t]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="px-2 py-2">
        <Skeleton className="h-6 w-32" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2.5">
      {/* Vault 名称 */}
      <span className="flex-1 truncate text-sm font-medium">
        {activeVault?.name || t('selectWorkspace')}
      </span>

      {/* Vault 切换下拉 */}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Icon icon={ArrowDown01Icon} className="size-4" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-56 p-0" align="start" sideOffset={4}>
          {/* Vault 列表 */}
          <ScrollArea className="max-h-64">
            <div className="p-1">
              {vaults.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t('noWorkspaces')}
                </div>
              ) : (
                vaults.map((vault) => (
                  <VaultListItem
                    key={vault.id}
                    vault={vault}
                    isActive={vault.id === activeVault?.id}
                    isEditing={editingId === vault.id}
                    editName={editName}
                    onSelect={() => handleSelect(vault)}
                    onStartEdit={(e) => handleStartEdit(vault, e)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onEditNameChange={setEditName}
                    onRemove={(e) => handleRemoveClick(vault, e)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* 分隔线 */}
          <div className="border-t" />

          {/* 操作按钮 */}
          <div className="p-1">
            <VaultListActions
              isCreating={isCreating}
              newVaultName={newVaultName}
              onNewVaultNameChange={setNewVaultName}
              onStartCreate={handleStartCreate}
              onCancelCreate={handleCancelCreate}
              onConfirmCreate={handleConfirmCreate}
              onOpenFolder={handleOpenFolder}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* 移除确认对话框 */}
      <VaultRemoveDialog
        vault={vaultToRemove}
        onConfirm={handleConfirmRemove}
        onCancel={() => setVaultToRemove(null)}
      />

      {/* 新建文件/文件夹菜单 */}
      <CreateMenu onCreateFile={onCreateFile} onCreateFolder={onCreateFolder} />
    </div>
  );
};
