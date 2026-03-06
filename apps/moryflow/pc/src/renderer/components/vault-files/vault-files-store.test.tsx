import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSyncVaultFilesStore, useVaultFilesStore } from './vault-files-store';

type VaultFilesSnapshot = Parameters<typeof useSyncVaultFilesStore>[0];

const noop = () => {};

const createSnapshot = (overrides: Partial<VaultFilesSnapshot> = {}): VaultFilesSnapshot => ({
  selectedId: null,
  onSelectFile: undefined,
  onSelectNode: undefined,
  onRename: undefined,
  onDelete: undefined,
  onCreateFile: undefined,
  onShowInFinder: undefined,
  onPublish: undefined,
  onMove: undefined,
  draggedNodeId: null,
  setDraggedNodeId: noop,
  dropTargetId: null,
  setDropTargetId: noop,
  ...overrides,
});

describe('useSyncVaultFilesStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips store write when snapshot fields are unchanged', () => {
    const initial = createSnapshot();
    const equivalent = { ...initial };
    const changed = createSnapshot({ selectedId: 'node-1' });

    const stateHook = renderHook(() => useVaultFilesStore((state) => state));
    const originalSetSnapshot = stateHook.result.current.setSnapshot;
    const setSnapshotSpy = vi.fn((next: VaultFilesSnapshot) => {
      originalSetSnapshot(next);
    });
    stateHook.result.current.setSnapshot = setSnapshotSpy;

    const sync = renderHook(
      ({ snapshot }: { snapshot: VaultFilesSnapshot }) => useSyncVaultFilesStore(snapshot),
      { initialProps: { snapshot: initial } }
    );

    const writesAfterInitialSync = setSnapshotSpy.mock.calls.length;

    act(() => {
      sync.rerender({ snapshot: equivalent });
    });
    expect(setSnapshotSpy.mock.calls.length).toBe(writesAfterInitialSync);

    act(() => {
      sync.rerender({ snapshot: changed });
    });
    expect(setSnapshotSpy.mock.calls.length).toBeGreaterThan(writesAfterInitialSync);

    sync.unmount();
    stateHook.unmount();
  });

  it('does not emit getSnapshot/max-update warnings with atomic selectors', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const initial = createSnapshot();
    const selectedIdHook = renderHook(() => useVaultFilesStore((state) => state.selectedId));
    const dropTargetIdHook = renderHook(() => useVaultFilesStore((state) => state.dropTargetId));
    const sync = renderHook(
      ({ snapshot }: { snapshot: VaultFilesSnapshot }) => useSyncVaultFilesStore(snapshot),
      { initialProps: { snapshot: initial } }
    );

    expect(selectedIdHook.result.current).toBe(null);
    expect(dropTargetIdHook.result.current).toBe(null);

    for (let index = 0; index < 5; index += 1) {
      act(() => {
        sync.rerender({ snapshot: { ...initial } });
      });
    }

    const logs = [...consoleErrorSpy.mock.calls, ...consoleWarnSpy.mock.calls]
      .flat()
      .map((value) => String(value))
      .join('\n');

    expect(logs).not.toContain('getSnapshot should be cached');
    expect(logs).not.toContain('Maximum update depth exceeded');

    sync.unmount();
    selectedIdHook.unmount();
    dropTargetIdHook.unmount();
  });
});
