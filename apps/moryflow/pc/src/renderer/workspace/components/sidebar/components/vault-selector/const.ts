/**
 * [DEFINES]: VaultSelector 类型定义
 * [USED_BY]: vault-selector/index.tsx, vault-selector/components/*
 * [POS]: Vault 选择器类型定义
 */

import type { VaultItem } from '@shared/ipc';

/** VaultSelector 主组件 Props */
export type VaultSelectorProps = {
  /** 切换 Vault 后的回调 */
  onVaultChange?: (vault: VaultItem) => void;
  /** 允许外层覆盖 trigger button 的样式（用于 Sidebar 顶部左右布局等场景） */
  triggerClassName?: string;
};

/** VaultListItem Props */
export type VaultListItemProps = {
  vault: VaultItem;
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  onSelect: () => void;
  onStartEdit: (e: React.MouseEvent) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onRemove: (e: React.MouseEvent) => void;
};

/** VaultListActions Props */
export type VaultListActionsProps = {
  isCreating: boolean;
  newVaultName: string;
  onNewVaultNameChange: (name: string) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onConfirmCreate: () => void;
  onOpenFolder: () => void;
};

/** VaultRemoveDialog Props */
export type VaultRemoveDialogProps = {
  vault: VaultItem | null;
  onConfirm: () => void;
  onCancel: () => void;
};
