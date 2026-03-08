/**
 * [PROVIDES]: useWorkspaceVault - Vault 生命周期与切换动作
 * [DEPENDS]: desktopAPI.vault, fetchTree
 * [POS]: Workspace Controller 的 Vault 子域（避免 handle.ts 过载）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback, useEffect, useState } from 'react';
import type { VaultInfo } from '@shared/ipc';
import type { WorkspaceVaultMessageKey } from '../const';

const NO_WORKSPACE_HINT_KEY: WorkspaceVaultMessageKey = 'workspaceUnavailableHint';

type WorkspaceVaultState = {
  vault: VaultInfo | null;
  isVaultHydrating: boolean;
  isPickingVault: boolean;
  vaultMessage: WorkspaceVaultMessageKey | null;
  handleVaultOpen: () => Promise<void>;
  handleSelectDirectory: () => Promise<string | null>;
  handleVaultCreate: (name: string, parentPath: string) => Promise<void>;
};

export const useWorkspaceVault = (): WorkspaceVaultState => {
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [isVaultHydrating, setIsVaultHydrating] = useState(true);
  const [isPickingVault, setIsPickingVault] = useState(false);
  const vaultMessage: WorkspaceVaultMessageKey | null =
    !isVaultHydrating && !vault ? NO_WORKSPACE_HINT_KEY : null;

  const hydrateVault = useCallback(async () => {
    setIsVaultHydrating(true);

    // 首次启动：自动创建默认 workspace（不阻塞 UI；失败则回退到原有选择流程）
    try {
      await window.desktopAPI.vault.ensureDefaultWorkspace();
    } catch (error) {
      console.warn('[workspace] ensureDefaultWorkspace failed', error);
    }

    try {
      const info = await window.desktopAPI.vault.getActiveVault();
      if (info) {
        setVault({ path: info.path });
      } else {
        setVault(null);
      }
    } catch (error) {
      console.warn('[workspace] getActiveVault failed', error);
      setVault(null);
    } finally {
      setIsVaultHydrating(false);
    }
  }, []);

  useEffect(() => {
    void hydrateVault();
  }, [hydrateVault]);

  // 监听活动工作区变更，更新 vault 状态
  useEffect(() => {
    if (!window.desktopAPI?.vault?.onActiveVaultChange) return;

    const dispose = window.desktopAPI.vault.onActiveVaultChange((newVault) => {
      setVault(newVault ? { path: newVault.path } : null);
    });

    return dispose;
  }, []);

  const handleVaultOpen = useCallback(async () => {
    setIsPickingVault(true);
    try {
      const info = await window.desktopAPI.vault.open({ askUser: true });
      if (!info) {
        return;
      }
      setVault(info);
    } finally {
      setIsPickingVault(false);
    }
  }, []);

  const handleSelectDirectory = useCallback(async () => {
    setIsPickingVault(true);
    try {
      const path = await window.desktopAPI.vault.selectDirectory?.();
      return path ?? null;
    } finally {
      setIsPickingVault(false);
    }
  }, []);

  const handleVaultCreate = useCallback(async (name: string, parentPath: string) => {
    setIsPickingVault(true);
    try {
      const info = await window.desktopAPI.vault.create?.({ name, parentPath });
      if (!info) {
        return;
      }
      setVault(info);
    } finally {
      setIsPickingVault(false);
    }
  }, []);

  return {
    vault,
    isVaultHydrating,
    isPickingVault,
    vaultMessage,
    handleVaultOpen,
    handleSelectDirectory,
    handleVaultCreate,
  };
};
