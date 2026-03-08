import type {
  CloudUsageInfo,
  CloudVault,
  SearchInput,
  SemanticSearchResult,
} from '../../shared/ipc.js';
import type { SearchResponse, UsageResponse, VaultListDto } from '../cloud-sync/api/types.js';

type CloudSyncVaultListApi = {
  listVaults: () => Promise<VaultListDto>;
};

type CloudSyncUsageApi = {
  getUsage: () => Promise<UsageResponse>;
};

type CloudSyncSearchApi = {
  search: (input: SearchInput) => Promise<SearchResponse>;
};

type CloudSyncStatusReader = {
  getStatus: () => {
    vaultPath?: string | null;
  };
};

type FileIndexReader = {
  getByFileId: (vaultPath: string, fileId: string) => string | null | undefined;
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

export async function searchCloudSyncIpc(
  api: CloudSyncSearchApi,
  engine: CloudSyncStatusReader,
  fileIndex: FileIndexReader,
  payload: SearchInput
): Promise<SemanticSearchResult[]> {
  const query = typeof payload.query === 'string' ? payload.query.trim() : '';
  if (!query) {
    return [];
  }

  try {
    const response = await api.search({
      query,
      topK: payload.topK,
      vaultId: payload.vaultId,
    });
    const status = engine.getStatus();
    if (!status.vaultPath) {
      return response.results;
    }

    return response.results.map((result) => ({
      ...result,
      localPath: fileIndex.getByFileId(status.vaultPath as string, result.fileId) ?? undefined,
    }));
  } catch (error) {
    console.error('[cloud-sync:search] error:', error);
    throw normalizeCloudSyncError(error);
  }
}
