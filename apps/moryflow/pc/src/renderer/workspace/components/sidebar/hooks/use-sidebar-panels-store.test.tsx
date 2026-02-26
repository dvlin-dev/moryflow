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
    const onShowInFinder = vi.fn();
    const onMove = vi.fn();
    const onCreateFileInRoot = vi.fn();
    const onCreateFolderInRoot = vi.fn();
    const onPublish = vi.fn();

    const initial: SidebarPanelsSnapshot = {
      agentSub: 'workspace',
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
});
