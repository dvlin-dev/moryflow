import type {
  UserStorageListParams,
  VaultListParams,
  VectorizedFileListParams,
} from '@/types/storage';

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

function buildPath(basePath: string, params: Record<string, unknown>): string {
  const query = buildQueryString(params);
  return query ? `${basePath}?${query}` : basePath;
}

export function buildVaultListPath(params: VaultListParams): string {
  return buildPath('/storage/vaults', params as Record<string, unknown>);
}

export function buildUserStorageListPath(params: UserStorageListParams): string {
  return buildPath('/storage/users', params as Record<string, unknown>);
}

export function buildVectorizedFileListPath(params: VectorizedFileListParams): string {
  return buildPath('/storage/vectorized', params as Record<string, unknown>);
}
