import { describe, expect, it } from 'vitest';
import { normalizeCloudSyncPath } from '../path-normalizer';

describe('normalizeCloudSyncPath', () => {
  it('normalizes windows separators into canonical sync path', () => {
    expect(normalizeCloudSyncPath('vault\\nested\\file.md')).toBe('vault/nested/file.md');
  });

  it('collapses duplicate separators and leading dot segments', () => {
    expect(normalizeCloudSyncPath('./vault//draft.md')).toBe('vault/draft.md');
  });
});
