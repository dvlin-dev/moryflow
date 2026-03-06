import { describe, it, expect } from 'vitest';
import type { FileEntry } from '@moryflow/api';
import { createEmptyClock } from '@moryflow/sync';
import { buildLocalChanges } from '../file-collector-core';

const deviceId = 'device-1';

const baseEntry = (overrides: Partial<FileEntry> = {}): FileEntry => ({
  id: 'file-1',
  path: 'note.md',
  createdAt: 1,
  vectorClock: createEmptyClock(),
  lastSyncedHash: 'hash-1',
  lastSyncedClock: createEmptyClock(),
  ...overrides,
});

describe('buildLocalChanges', () => {
  it('increments clock when content changes', () => {
    const entry = baseEntry();
    const { dtos, pendingChanges } = buildLocalChanges(
      [entry],
      [
        {
          fileId: entry.id,
          path: entry.path,
          size: 10,
          mtime: 1000,
          contentHash: 'hash-2',
          exists: true,
        },
      ],
      deviceId
    );

    expect(dtos).toHaveLength(1);
    expect(dtos[0].vectorClock[deviceId]).toBe(1);
    expect(pendingChanges.get(entry.id)?.type).toBe('modified');
    expect(pendingChanges.get(entry.id)?.expectedHash).toBe('hash-1');
  });

  it('does not increment clock when content is unchanged', () => {
    const entry = baseEntry({ vectorClock: { [deviceId]: 3 } });
    const { dtos, pendingChanges } = buildLocalChanges(
      [entry],
      [
        {
          fileId: entry.id,
          path: entry.path,
          size: 10,
          mtime: 1000,
          contentHash: 'hash-1',
          exists: true,
        },
      ],
      deviceId
    );

    expect(dtos).toHaveLength(1);
    expect(dtos[0].vectorClock[deviceId]).toBe(3);
    expect(pendingChanges.size).toBe(0);
  });

  it('emits tombstone when file is deleted', () => {
    const entry = baseEntry();
    const { dtos, pendingChanges } = buildLocalChanges(
      [entry],
      [
        {
          fileId: entry.id,
          path: entry.path,
          size: 0,
          mtime: null,
          contentHash: '',
          exists: false,
        },
      ],
      deviceId
    );

    expect(dtos).toHaveLength(1);
    expect(dtos[0].contentHash).toBe('');
    expect(pendingChanges.get(entry.id)?.type).toBe('deleted');
  });

  it('marks new files with expectedHash undefined', () => {
    const entry = baseEntry({ lastSyncedHash: null });
    const { pendingChanges } = buildLocalChanges(
      [entry],
      [
        {
          fileId: entry.id,
          path: entry.path,
          size: 10,
          mtime: 1000,
          contentHash: 'hash-new',
          exists: true,
        },
      ],
      deviceId
    );

    expect(pendingChanges.get(entry.id)?.type).toBe('new');
    expect(pendingChanges.get(entry.id)?.expectedHash).toBeUndefined();
  });

  it('keeps synced files stable when snapshot is skipped', () => {
    const entry = baseEntry({
      lastSyncedHash: 'hash-1',
      lastSyncedSize: 10,
      lastSyncedMtime: 100,
      vectorClock: { [deviceId]: 2 },
    });
    const { dtos, pendingChanges, localStates } = buildLocalChanges(
      [entry],
      [
        {
          fileId: entry.id,
          path: entry.path,
          size: 10,
          mtime: 100,
          contentHash: 'hash-1',
          exists: true,
          skipped: true,
        },
      ],
      deviceId
    );

    expect(dtos).toHaveLength(1);
    expect(dtos[0].contentHash).toBe('hash-1');
    expect(dtos[0].vectorClock[deviceId]).toBe(2);
    expect(pendingChanges.size).toBe(0);
    expect(localStates.get(entry.id)?.contentHash).toBe('hash-1');
  });

  it('ignores skipped snapshots for never-synced files', () => {
    const entry = baseEntry({ lastSyncedHash: null });
    const { dtos, pendingChanges, localStates } = buildLocalChanges(
      [entry],
      [
        {
          fileId: entry.id,
          path: entry.path,
          size: 100,
          mtime: 200,
          contentHash: '',
          exists: true,
          skipped: true,
        },
      ],
      deviceId
    );

    expect(dtos).toHaveLength(0);
    expect(pendingChanges.size).toBe(0);
    expect(localStates.size).toBe(0);
  });
});
