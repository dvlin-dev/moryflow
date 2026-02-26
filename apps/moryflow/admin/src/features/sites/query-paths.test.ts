import { describe, expect, it } from 'vitest';
import { buildSitesListPath } from './query-paths';

describe('buildSitesListPath', () => {
  it('包含必填分页参数', () => {
    expect(
      buildSitesListPath({
        limit: 20,
        offset: 40,
      })
    ).toBe('/sites?limit=20&offset=40');
  });

  it('包含可选筛选参数并过滤空值', () => {
    expect(
      buildSitesListPath({
        limit: 20,
        offset: 0,
        search: 'hello',
        status: 'ACTIVE',
        type: 'MARKDOWN',
        userTier: 'pro',
      })
    ).toBe('/sites?limit=20&offset=0&search=hello&status=ACTIVE&type=MARKDOWN&userTier=pro');
  });
});
