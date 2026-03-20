import { describe, expect, it, vi, afterEach } from 'vitest';
import { getCloudSyncUsageIpc, listCloudVaultsIpc } from './cloud-sync-handlers';

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

  it('rethrows vault list failures instead of collapsing them into an empty array', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      listCloudVaultsIpc({
        listVaults: vi.fn().mockRejectedValue(new Error('vault list unavailable')),
      })
    ).rejects.toThrow('vault list unavailable');
  });

  it('rethrows usage failures instead of pretending usage is zero', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      getCloudSyncUsageIpc({
        getUsage: vi.fn().mockRejectedValue(new Error('usage unavailable')),
      })
    ).rejects.toThrow('usage unavailable');
  });
});
