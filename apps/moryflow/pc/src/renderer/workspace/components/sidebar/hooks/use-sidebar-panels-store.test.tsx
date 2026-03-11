import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSidebarPanelsStore, useSyncSidebarPanelsStore } from './use-sidebar-panels-store';

type SidebarPanelsSnapshot = Parameters<typeof useSyncSidebarPanelsStore>[0];

describe('useSyncSidebarPanelsStore', () => {
  it('skips store write when snapshot fields are unchanged', () => {
    const tree: SidebarPanelsSnapshot['tree'] = [
      {
        id: 'root-note',
        name: 'root-note.md',
        type: 'file',
        path: '/vault/root-note.md',
      },
    ];
    const onOpenThread = vi.fn();
    const onSelectNode = vi.fn();
    const onExpandedPathsChange = vi.fn();
    const onOpenFile = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();
    const onCreateFile = vi.fn();
    const onCreateFolder = vi.fn();
    const onShowInFinder = vi.fn();
    const onMove = vi.fn();
    const onCreateFileInRoot = vi.fn();
    const onCreateFolderInRoot = vi.fn();
    const onPublish = vi.fn();

    const initial: SidebarPanelsSnapshot = {
      destination: 'agent',
      sidebarMode: 'home',
      vault: { path: '/vault' },
      tree,
      expandedPaths: ['/vault'],
      treeState: 'loading',
      treeError: null,
      selectedId: 'root-note',
      onOpenThread,
      onSelectNode,
      onExpandedPathsChange,
      onOpenFile,
      onRename,
      onDelete,
      onCreateFile,
      onCreateFolder,
      onShowInFinder,
      onMove,
      onCreateFileInRoot,
      onCreateFolderInRoot,
      onPublish,
    };
    const equivalent: SidebarPanelsSnapshot = { ...initial };
    const changed: SidebarPanelsSnapshot = { ...initial, selectedId: 'other-note' };

    const stateHook = renderHook(() => useSidebarPanelsStore((state) => state));
    const originalSetSnapshot = stateHook.result.current.setSnapshot;
    const setSnapshotSpy = vi.fn((next: SidebarPanelsSnapshot) => {
      originalSetSnapshot(next);
    });
    stateHook.result.current.setSnapshot = setSnapshotSpy;

    const sync = renderHook(
      ({ snapshot }: { snapshot: SidebarPanelsSnapshot }) => useSyncSidebarPanelsStore(snapshot),
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

  it('syncs onCreateFolder alongside onCreateFile for folder-scoped tree actions', () => {
    const snapshot = {
      destination: 'agent',
      sidebarMode: 'home',
      vault: { path: '/vault' },
      tree: [],
      expandedPaths: [],
      treeState: 'idle',
      treeError: null,
      selectedId: null,
      onOpenThread: vi.fn(),
      onSelectNode: vi.fn(),
      onExpandedPathsChange: vi.fn(),
      onOpenFile: vi.fn(),
      onRename: vi.fn(),
      onDelete: vi.fn(),
      onCreateFile: vi.fn(),
      onCreateFolder: vi.fn(),
      onShowInFinder: vi.fn(),
      onMove: vi.fn(),
      onCreateFileInRoot: vi.fn(),
      onCreateFolderInRoot: vi.fn(),
      onPublish: vi.fn(),
    } satisfies SidebarPanelsSnapshot;

    const stateHook = renderHook(() => useSidebarPanelsStore((state) => state));
    const originalSetSnapshot = stateHook.result.current.setSnapshot;
    const setSnapshotSpy = vi.fn((next: SidebarPanelsSnapshot) => {
      originalSetSnapshot(next);
    });
    stateHook.result.current.setSnapshot = setSnapshotSpy;

    const sync = renderHook(
      ({ nextSnapshot }: { nextSnapshot: SidebarPanelsSnapshot }) =>
        useSyncSidebarPanelsStore(nextSnapshot),
      { initialProps: { nextSnapshot: snapshot } }
    );

    const writesAfterInitialSync = setSnapshotSpy.mock.calls.length;

    act(() => {
      sync.rerender({
        nextSnapshot: {
          ...snapshot,
          onCreateFolder: vi.fn(),
        },
      });
    });

    expect(setSnapshotSpy.mock.calls.length).toBeGreaterThan(writesAfterInitialSync);

    sync.unmount();
    stateHook.unmount();
  });
});
