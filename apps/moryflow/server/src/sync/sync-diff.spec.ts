import { describe, it, expect } from 'vitest';
import type { LocalFileDto } from './dto';
import { computeSyncActions, type RemoteFile } from './sync-diff';

const deviceName = 'Test Device';

const localFile = (overrides: Partial<LocalFileDto> = {}): LocalFileDto => ({
  fileId: 'file-1',
  path: 'a.md',
  title: 'a',
  size: 10,
  contentHash: 'hash-1',
  vectorClock: {},
  ...overrides,
});

const remoteFile = (overrides: Partial<RemoteFile> = {}): RemoteFile => ({
  id: 'file-1',
  path: 'a.md',
  title: 'a',
  size: 10,
  contentHash: 'hash-1',
  vectorClock: {},
  isDeleted: false,
  ...overrides,
});

describe('computeSyncActions', () => {
  it('downloads when remote rename is newer and content is same', () => {
    const actions = computeSyncActions(
      [localFile({ vectorClock: {} })],
      [remoteFile({ path: 'b.md', vectorClock: { remote: 1 } })],
      deviceName,
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('download');
    expect(actions[0].path).toBe('b.md');
  });

  it('downloads to fast-forward clock when content is same and remote is newer', () => {
    const actions = computeSyncActions(
      [localFile({ vectorClock: { local: 1 } })],
      [remoteFile({ vectorClock: { local: 2 } })],
      deviceName,
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('download');
  });

  it('uploads to fast-forward clock when content is same and local is newer', () => {
    const actions = computeSyncActions(
      [localFile({ vectorClock: { local: 2 } })],
      [remoteFile({ vectorClock: { local: 1 } })],
      deviceName,
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('upload');
  });

  it('creates conflict action on concurrent edits', () => {
    const actions = computeSyncActions(
      [
        localFile({
          contentHash: 'hash-local',
          vectorClock: { deviceA: 1 },
        }),
      ],
      [
        remoteFile({
          contentHash: 'hash-remote',
          vectorClock: { deviceB: 1 },
        }),
      ],
      deviceName,
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('conflict');
    expect(actions[0].conflictCopyId).toBeDefined();
    expect(actions[0].conflictRename).toContain('Test Device');
  });
});
