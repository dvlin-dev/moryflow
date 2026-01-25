import { describe, it, expect } from 'vitest';
import type { LocalFileDto } from './dto';
import type { RemoteFile } from './sync-diff';
import { computeUploadQuotaStats } from './sync-quota';

const localFile = (overrides: Partial<LocalFileDto> = {}): LocalFileDto => ({
  fileId: 'file-1',
  path: 'note.md',
  title: 'note',
  size: 10,
  contentHash: 'hash-local',
  vectorClock: {},
  ...overrides,
});

const remoteFile = (overrides: Partial<RemoteFile> = {}): RemoteFile => ({
  id: 'file-1',
  path: 'note.md',
  title: 'note',
  size: 8,
  contentHash: 'hash-remote',
  vectorClock: {},
  isDeleted: false,
  ...overrides,
});

describe('computeUploadQuotaStats', () => {
  it('uses local size as delta for conflict even when local is smaller', () => {
    const { totalNewSize } = computeUploadQuotaStats(
      [localFile({ size: 3 })],
      [remoteFile({ size: 9 })],
      [{ fileId: 'file-1', path: 'note.md', action: 'conflict' }],
    );

    expect(totalNewSize).toBe(3);
  });

  it('adds only positive diff for upload actions', () => {
    const { totalNewSize } = computeUploadQuotaStats(
      [localFile({ size: 12 })],
      [remoteFile({ size: 10 })],
      [{ fileId: 'file-1', path: 'note.md', action: 'upload' }],
    );

    expect(totalNewSize).toBe(2);
  });
});
