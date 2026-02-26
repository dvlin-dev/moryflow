/**
 * [PROVIDES]: useWorkspaceVault - Vault 生命周期与切换动作
 * [DEPENDS]: desktopAPI.vault, fetchTree
 * [POS]: Workspace Controller 的 Vault 子域（避免 handle.ts 过载）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useState } from 'react';
import type { VaultInfo } from '@shared/ipc';

type WorkspaceVaultState = {
  vault: VaultInfo | null;
  isPickingVault: boolean;
  vaultMessage: string | null;
  handleVaultOpen: () => Promise<void>;
  handleSelectDirectory: () => Promise<string | null>;
  handleVaultCreate: (name: string, parentPath: string) => Promise<void>;
};

export const useWorkspaceVault = (): WorkspaceVaultState => {
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [isPickingVault, setIsPickingVault] = useState(false);
  const [vaultMessage, setVaultMessage] = useState<string | null>(null);

  const hydrateVault = useCallback(async () => {
    // 首次启动：自动创建默认 workspace（不阻塞 UI；失败则回退到原有选择流程）
    try {
      await window.desktopAPI.vault.ensureDefaultWorkspace();
    } catch (error) {
      console.warn('[workspace] ensureDefaultWorkspace failed', error);
    }

    const info = await window.desktopAPI.vault.getActiveVault();
    setVault(info ? { path: info.path } : null);
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
    setVaultMessage(null);
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

  const handleVaultCreate = useCallback(
    async (name: string, parentPath: string) => {
      setIsPickingVault(true);
      setVaultMessage(null);
      try {
        const info = await window.desktopAPI.vault.create?.({ name, parentPath });
        if (!info) {
          return;
        }
        setVault(info);
      } finally {
        setIsPickingVault(false);
      }
    },
    []
  );

  return {
    vault,
    isPickingVault,
    vaultMessage,
    handleVaultOpen,
    handleSelectDirectory,
    handleVaultCreate,
  };
};
