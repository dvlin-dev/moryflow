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
  storageRevision: null,
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

  it('carries remote storageRevision on download action', () => {
    const actions = computeSyncActions(
      [localFile({ vectorClock: { local: 1 } })],
      [
        remoteFile({
          vectorClock: { local: 2 },
          storageRevision: 'revision-1',
        }),
      ],
      deviceName,
    );

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      action: 'download',
      storageRevision: 'revision-1',
    });
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

  it('adds expected contentHash on delete action when local tombstone wins', () => {
    const actions = computeSyncActions(
      [
        localFile({
          contentHash: '',
          vectorClock: { local: 2 },
        }),
      ],
      [
        remoteFile({
          contentHash: 'hash-remote',
          vectorClock: { local: 1 },
          isDeleted: false,
        }),
      ],
      deviceName,
    );

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      action: 'delete',
      fileId: 'file-1',
      path: 'a.md',
      contentHash: 'hash-remote',
    });
  });

  it('sanitizes conflict copy name for unsafe device names', () => {
    const actions = computeSyncActions(
      [
        localFile({
          fileId: 'file-unsafe',
          path: 'note.md',
          contentHash: 'hash-local',
          vectorClock: { deviceA: 1 },
        }),
      ],
      [
        remoteFile({
          id: 'file-unsafe',
          path: 'note.md',
          contentHash: 'hash-remote',
          vectorClock: { deviceB: 1 },
        }),
      ],
      'Mac/Office:DEV',
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('conflict');
    expect(actions[0].conflictRename).toBeDefined();
    expect(actions[0].conflictRename).not.toContain(':');
    expect(actions[0].conflictRename).not.toContain('Mac/Office');
  });
});
