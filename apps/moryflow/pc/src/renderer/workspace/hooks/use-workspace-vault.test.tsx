import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesktopApi, VaultItem } from '@shared/ipc';
import { useWorkspaceVault } from './use-workspace-vault';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useWorkspaceVault', () => {
  const setupDesktopApi = ({
    ensureDefaultWorkspace,
    getActiveVault,
    open = vi.fn().mockResolvedValue(null),
    create = vi.fn().mockResolvedValue(null),
  }: {
    ensureDefaultWorkspace: () => Promise<VaultItem | null>;
    getActiveVault: () => Promise<VaultItem | null>;
    open?: () => Promise<VaultItem | null>;
    create?: () => Promise<VaultItem | null>;
  }) => {
    let activeVaultHandler: ((vault: VaultItem | null) => void) | null = null;

    window.desktopAPI = {
      vault: {
        ensureDefaultWorkspace,
        getActiveVault,
        onActiveVaultChange: (handler: (vault: VaultItem | null) => void) => {
          activeVaultHandler = handler;
          return () => {
            activeVaultHandler = null;
          };
        },
        open,
        create,
        selectDirectory: vi.fn(),
      },
    } as unknown as DesktopApi;

    return {
      emitActiveVaultChange: (vault: VaultItem | null) => {
        activeVaultHandler?.(vault);
      },
      open,
      create,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks hydration as done and sets vault when default workspace is available', async () => {
    const ensureDefaultWorkspace = vi.fn().mockResolvedValue({
      id: 'vault-1',
      name: 'workspace',
      path: '/vault/workspace',
      addedAt: Date.now(),
    });
    const getActiveVault = vi.fn().mockResolvedValue({
      id: 'vault-1',
      name: 'workspace',
      path: '/vault/workspace',
      addedAt: Date.now(),
    });

    setupDesktopApi({
      ensureDefaultWorkspace,
      getActiveVault,
    });

    const { result } = renderHook(() => useWorkspaceVault());

    expect(result.current.isVaultHydrating).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isVaultHydrating).toBe(false);
      },
      { timeout: 30_000 }
    );

    expect(ensureDefaultWorkspace).toHaveBeenCalledTimes(1);
    expect(getActiveVault).toHaveBeenCalledTimes(1);
    expect(result.current.vault).toEqual({ path: '/vault/workspace' });
    expect(result.current.vaultMessage).toBeNull();
  });

  it('shows no-workspace hint when bootstrap fails and clears hint after active vault arrives', async () => {
    const ensureDefaultWorkspace = vi.fn().mockResolvedValue(null);
    const getActiveVault = vi.fn().mockResolvedValue(null);

    const { emitActiveVaultChange } = setupDesktopApi({
      ensureDefaultWorkspace,
      getActiveVault,
    });

    const { result } = renderHook(() => useWorkspaceVault());

    await waitFor(
      () => {
        expect(result.current.isVaultHydrating).toBe(false);
      },
      { timeout: 30_000 }
    );

    expect(result.current.vault).toBeNull();
    expect(result.current.vaultMessage).toBe('workspaceUnavailableHint');

    act(() => {
      emitActiveVaultChange({
        id: 'vault-2',
        name: 'manual',
        path: '/vault/manual',
        addedAt: Date.now(),
      });
    });

    expect(result.current.vault).toEqual({ path: '/vault/manual' });
    expect(result.current.vaultMessage).toBeNull();
  });

  it('keeps no-workspace hint when open/create is canceled', async () => {
    const ensureDefaultWorkspace = vi.fn().mockResolvedValue(null);
    const getActiveVault = vi.fn().mockResolvedValue(null);
    const open = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(null);

    setupDesktopApi({
      ensureDefaultWorkspace,
      getActiveVault,
      open,
      create,
    });

    const { result } = renderHook(() => useWorkspaceVault());

    await waitFor(
      () => {
        expect(result.current.isVaultHydrating).toBe(false);
      },
      { timeout: 30_000 }
    );
    expect(result.current.vaultMessage).toBe('workspaceUnavailableHint');

    await act(async () => {
      await result.current.handleVaultOpen();
    });
    expect(open).toHaveBeenCalledTimes(1);
    expect(result.current.vault).toBeNull();
    expect(result.current.vaultMessage).toBe('workspaceUnavailableHint');

    await act(async () => {
      await result.current.handleVaultCreate('workspace', '/vault');
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(result.current.vault).toBeNull();
    expect(result.current.vaultMessage).toBe('workspaceUnavailableHint');
  });
});
