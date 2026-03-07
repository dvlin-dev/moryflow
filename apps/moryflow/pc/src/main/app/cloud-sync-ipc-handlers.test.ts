import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  getCloudSyncUsageIpc,
  listCloudVaultsIpc,
  searchCloudSyncIpc,
} from './cloud-sync-ipc-handlers';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cloud sync IPC handlers', () => {
  it('maps list vault response to renderer contract', async () => {
    const result = await listCloudVaultsIpc({
      listVaults: vi.fn().mockResolvedValue({
        vaults: [
          {
            id: 'vault-1',
            name: 'Docs',
            fileCount: 3,
            deviceCount: 2,
          },
        ],
      }),
    });

    expect(result).toEqual([
      {
        id: 'vault-1',
        name: 'Docs',
        fileCount: 3,
        deviceCount: 2,
      },
    ]);
  });

  it('rethrows usage failures instead of pretending usage is zero', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      getCloudSyncUsageIpc({
        getUsage: vi.fn().mockRejectedValue(new Error('usage unavailable')),
      })
    ).rejects.toThrow('usage unavailable');
  });

  it('adds localPath when search results can be resolved from active vault', async () => {
    const result = await searchCloudSyncIpc(
      {
        search: vi.fn().mockResolvedValue({
          results: [
            {
              fileId: 'file-1',
              vaultId: 'vault-1',
              path: '/Doc.md',
              snippet: 'hello',
              score: 0.8,
              title: 'Doc',
            },
          ],
        }),
      },
      {
        getStatus: () => ({ vaultPath: '/tmp/vault' }),
      },
      {
        getByFileId: (vaultPath: string, fileId: string) =>
          vaultPath === '/tmp/vault' && fileId === 'file-1' ? '/tmp/vault/Doc.md' : null,
      },
      {
        query: 'hello',
        topK: 5,
        vaultId: 'vault-1',
      }
    );

    expect(result).toEqual([
      {
        fileId: 'file-1',
        vaultId: 'vault-1',
        path: '/Doc.md',
        snippet: 'hello',
        score: 0.8,
        title: 'Doc',
        localPath: '/tmp/vault/Doc.md',
      },
    ]);
  });

  it('rethrows search failures instead of collapsing them into an empty result', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      searchCloudSyncIpc(
        {
          search: vi.fn().mockRejectedValue(new Error('search failed')),
        },
        {
          getStatus: () => ({ vaultPath: '/tmp/vault' }),
        },
        {
          getByFileId: () => null,
        },
        {
          query: 'hello',
        }
      )
    ).rejects.toThrow('search failed');
  });
});
