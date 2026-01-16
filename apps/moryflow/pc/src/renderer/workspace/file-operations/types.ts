import type React from 'react';
import type { VaultInfo, VaultTreeNode } from '@shared/ipc';
import type { InterpolationParams } from '@anyhunt/i18n';

import type { ActiveDocument, SelectedFile } from '../const';

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export type VaultGuard = () => boolean;

/** 翻译函数类型 - 使用 any 兼容各命名空间的具体类型 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TranslateFunction = (key: any, params?: InterpolationParams) => string;

export type UseVaultFileOperationsOptions = {
  vault: VaultInfo | null;
  selectedEntry: VaultTreeNode | null;
  activeDoc: ActiveDocument | null;
  fetchTree: (path: string) => Promise<void>;
  resetEditorState: () => void;
  loadDocument: (file: SelectedFile) => Promise<void> | void;
  setPendingSelectionPath: SetState<string | null>;
  setPendingOpenPath: SetState<string | null>;
  setOpenTabs: SetState<SelectedFile[]>;
  /** 设置选中的节点（与 useVaultTreeState 返回的类型保持一致） */
  setSelectedEntry: (node: VaultTreeNode | null) => void;
  showInputDialog: (options: {
    title: string;
    description?: string;
    defaultValue?: string;
    placeholder?: string;
  }) => Promise<string | null>;
};
