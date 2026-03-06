/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { normalizeCloudSyncPath } from '../path-normalizer';

describe('normalizeCloudSyncPath', () => {
  it('normalizes windows separators into canonical sync path', () => {
    expect(normalizeCloudSyncPath('notes\\nested\\file.md')).toBe('notes/nested/file.md');
  });

  it('collapses duplicate separators and leading dot segments', () => {
    expect(normalizeCloudSyncPath('./notes//draft.md')).toBe('notes/draft.md');
  });
});
