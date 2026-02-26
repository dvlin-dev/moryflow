import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useSyncWorkspaceShellViewStore,
  useWorkspaceShellViewStore,
} from './workspace-shell-view-store';

type WorkspaceShellViewSnapshot = Parameters<typeof useSyncWorkspaceShellViewStore>[0];

describe('useSyncWorkspaceShellViewStore', () => {
  it('skips store write when snapshot fields are unchanged', () => {
    const onToggleChatPanel = vi.fn();
    const onOpenSettings = vi.fn();
    const onChatReady = vi.fn();
    const onCommandOpenChange = vi.fn();
    const onInputDialogConfirm = vi.fn();
    const onInputDialogCancel = vi.fn();
    const onSettingsOpenChange = vi.fn();
    const commandActions: WorkspaceShellViewSnapshot['commandActions'] = [
      { id: 'open', label: 'Open', handler: vi.fn() },
    ];
    const layoutState = {
      panelGroupRef: { current: null },
      sidebarPanelRef: { current: null },
      workspaceChatPanelRef: { current: null },
      sidebarCollapsed: false,
      chatCollapsed: false,
      sidebarWidth: 320,
      toggleSidebarPanel: vi.fn(),
      toggleChatPanel: vi.fn(),
      onSidebarCollapse: vi.fn(),
      onSidebarExpand: vi.fn(),
      onChatCollapse: vi.fn(),
      onChatExpand: vi.fn(),
      handleSidebarResize: vi.fn(),
      sidebarDefaultSizePercent: 25,
      sidebarMinSizePercent: 10,
      sidebarMaxSizePercent: 40,
      mainMinSizePercent: 60,
    } as WorkspaceShellViewSnapshot['layoutState'];
    const selectedFile: WorkspaceShellViewSnapshot['selectedFile'] = {
      id: 'note-1',
      name: 'note-1.md',
      path: '/vault/note-1.md',
    };
    const activeDoc: WorkspaceShellViewSnapshot['activeDoc'] = {
      ...selectedFile,
      content: '# note',
      mtime: 1,
    };
    const inputDialogState: WorkspaceShellViewSnapshot['inputDialogState'] = {
      open: false,
      title: 'Rename',
      resolve: null,
    };

    const initial: WorkspaceShellViewSnapshot = {
      destination: 'skills',
      agentSub: 'workspace',
      vaultPath: '/vault',
      treeState: 'loading',
      treeLength: 3,
      selectedFile,
      activeDoc,
      chatFallback: 'chat-fallback',
      startupSkeleton: 'startup-skeleton',
      layoutState,
      onToggleChatPanel,
      onOpenSettings,
      onChatReady,
      commandOpen: true,
      onCommandOpenChange,
      commandActions,
      inputDialogState,
      onInputDialogConfirm,
      onInputDialogCancel,
      settingsOpen: true,
      settingsSection: 'providers',
      onSettingsOpenChange,
    };
    const equivalent: WorkspaceShellViewSnapshot = { ...initial };
    const equivalentWithNewLayoutObject: WorkspaceShellViewSnapshot = {
      ...initial,
      layoutState: { ...layoutState },
    };
    const changed: WorkspaceShellViewSnapshot = { ...initial, commandOpen: false };

    const stateHook = renderHook(() => useWorkspaceShellViewStore((state) => state));
    const originalSetSnapshot = stateHook.result.current.setSnapshot;
    const setSnapshotSpy = vi.fn((next: WorkspaceShellViewSnapshot) => {
      originalSetSnapshot(next);
    });
    stateHook.result.current.setSnapshot = setSnapshotSpy;

    const sync = renderHook(
      ({ snapshot }: { snapshot: WorkspaceShellViewSnapshot }) =>
        useSyncWorkspaceShellViewStore(snapshot),
      { initialProps: { snapshot: initial } }
    );

    const writesAfterInitialSync = setSnapshotSpy.mock.calls.length;

    act(() => {
      sync.rerender({ snapshot: equivalent });
    });

    expect(setSnapshotSpy.mock.calls.length).toBe(writesAfterInitialSync);

    act(() => {
      sync.rerender({ snapshot: equivalentWithNewLayoutObject });
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
