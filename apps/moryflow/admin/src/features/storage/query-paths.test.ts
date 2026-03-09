import { describe, expect, it } from 'vitest';
import { buildUserStorageListPath, buildVaultListPath } from './query-paths';

describe('storage query path builders', () => {
  it('buildVaultListPath 应忽略空值参数', () => {
    const path = buildVaultListPath({
      limit: 20,
      offset: 40,
      search: '',
      userId: undefined,
    });
    expect(path).toBe('/storage/vaults?limit=20&offset=40');
  });

  it('buildUserStorageListPath 应编码搜索参数', () => {
    const path = buildUserStorageListPath({
      limit: 10,
      offset: 0,
      search: 'user name',
    });
    expect(path).toBe('/storage/users?limit=10&offset=0&search=user+name');
  });
});
