import type { CloudUsageInfo, CloudVault } from '../../shared/ipc.js';
import type { UsageResponse, VaultListDto } from '../cloud-sync/api/types.js';

type CloudSyncVaultListApi = {
  listVaults: () => Promise<VaultListDto>;
};

type CloudSyncUsageApi = {
  getUsage: () => Promise<UsageResponse>;
};

function normalizeCloudSyncError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

export async function listCloudVaultsIpc(api: CloudSyncVaultListApi): Promise<CloudVault[]> {
  try {
    const { vaults } = await api.listVaults();
    return vaults.map((vault) => ({
      id: vault.id,
      name: vault.name,
      fileCount: vault.fileCount,
      deviceCount: vault.deviceCount,
    }));
  } catch (error) {
    console.error('[cloud-sync:listCloudVaults] error:', error);
    throw normalizeCloudSyncError(error);
  }
}

export async function getCloudSyncUsageIpc(api: CloudSyncUsageApi): Promise<CloudUsageInfo> {
  try {
    const result = await api.getUsage();
    console.log('[cloud-sync:getUsage] success:', {
      storage: result.storage,
      plan: result.plan,
    });
    return result;
  } catch (error) {
    console.error('[cloud-sync:getUsage] API failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw normalizeCloudSyncError(error);
  }
}
