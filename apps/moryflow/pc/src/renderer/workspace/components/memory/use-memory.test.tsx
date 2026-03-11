import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoryPageState } from './use-memory';

const mockUseWorkspaceNav = vi.fn();
const mockUseWorkspaceVault = vi.fn();

vi.mock('../../context', () => ({
  useWorkspaceNav: () => mockUseWorkspaceNav(),
  useWorkspaceVault: () => mockUseWorkspaceVault(),
}));

describe('useMemoryPageState', () => {
  beforeEach(() => {
    mockUseWorkspaceNav.mockReturnValue({
      destination: 'memory',
    });
    mockUseWorkspaceVault.mockReturnValue({
      vault: {
        path: '/vaults/alpha',
      },
    });
    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview: vi.fn(async () => ({
          scope: {
            workspaceId: 'workspace-1',
            workspaceName: 'Workspace',
            localPath: '/vaults/alpha',
            vaultId: 'vault-1',
            projectId: 'vault-1',
          },
          binding: {
            loggedIn: true,
            bound: true,
          },
          sync: {
            engineStatus: 'idle',
            lastSyncAt: null,
            storageUsedBytes: 1,
          },
          indexing: {
            sourceCount: 1,
            indexedSourceCount: 1,
            pendingSourceCount: 0,
            failedSourceCount: 0,
            lastIndexedAt: null,
          },
          facts: {
            manualCount: 1,
            derivedCount: 0,
          },
          graph: {
            entityCount: 0,
            relationCount: 0,
            projectionStatus: 'idle',
            lastProjectedAt: null,
          },
        })),
      },
    } as typeof window.desktopAPI;
  });

  it('refreshes overview again when the active workspace changes while staying in Memory', async () => {
    const getOverview = vi
      .fn()
      .mockResolvedValueOnce({
        scope: {
          workspaceId: 'workspace-1',
          workspaceName: 'Workspace A',
          localPath: '/vaults/alpha',
          vaultId: 'vault-1',
          projectId: 'vault-1',
        },
        binding: {
          loggedIn: true,
          bound: true,
        },
        sync: {
          engineStatus: 'idle',
          lastSyncAt: null,
          storageUsedBytes: 1,
        },
        indexing: {
          sourceCount: 1,
          indexedSourceCount: 1,
          pendingSourceCount: 0,
          failedSourceCount: 0,
          lastIndexedAt: null,
        },
        facts: {
          manualCount: 1,
          derivedCount: 0,
        },
        graph: {
          entityCount: 0,
          relationCount: 0,
          projectionStatus: 'idle',
          lastProjectedAt: null,
        },
      })
      .mockResolvedValueOnce({
        scope: {
          workspaceId: 'workspace-2',
          workspaceName: 'Workspace B',
          localPath: '/vaults/beta',
          vaultId: 'vault-2',
          projectId: 'vault-2',
        },
        binding: {
          loggedIn: true,
          bound: true,
        },
        sync: {
          engineStatus: 'idle',
          lastSyncAt: null,
          storageUsedBytes: 2,
        },
        indexing: {
          sourceCount: 2,
          indexedSourceCount: 2,
          pendingSourceCount: 0,
          failedSourceCount: 0,
          lastIndexedAt: null,
        },
        facts: {
          manualCount: 2,
          derivedCount: 0,
        },
        graph: {
          entityCount: 1,
          relationCount: 0,
          projectionStatus: 'building',
          lastProjectedAt: null,
        },
      });

    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview,
      },
    } as typeof window.desktopAPI;

    const { result, rerender } = renderHook(() => useMemoryPageState());

    await waitFor(() => {
      expect(result.current.overview?.scope.workspaceId).toBe('workspace-1');
    });

    mockUseWorkspaceVault.mockReturnValue({
      vault: {
        path: '/vaults/beta',
      },
    });
    rerender();

    await waitFor(() => {
      expect(result.current.overview?.scope.workspaceId).toBe('workspace-2');
    });
    expect(getOverview).toHaveBeenCalledTimes(2);
  });

  it('does not fetch while the destination is not memory', async () => {
    const getOverview = vi.fn();
    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview,
      },
    } as typeof window.desktopAPI;
    mockUseWorkspaceNav.mockReturnValue({
      destination: 'skills',
    });

    renderHook(() => useMemoryPageState());

    await act(async () => {});
    expect(getOverview).not.toHaveBeenCalled();
  });
});
