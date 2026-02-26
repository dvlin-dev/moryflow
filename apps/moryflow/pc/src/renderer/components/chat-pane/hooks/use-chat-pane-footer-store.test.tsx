import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useChatPaneFooterStore, useSyncChatPaneFooterStore } from './use-chat-pane-footer-store';

type ChatPaneFooterSnapshot = Parameters<typeof useSyncChatPaneFooterStore>[0];

const createSnapshot = (
  overrides: Partial<ChatPaneFooterSnapshot> = {}
): ChatPaneFooterSnapshot => ({
  status: 'ready',
  inputError: null,
  activeFilePath: null,
  activeFileContent: null,
  vaultPath: null,
  modelGroups: [],
  selectedModelId: null,
  selectedThinkingLevel: null,
  selectedThinkingProfile: undefined,
  disabled: false,
  tokenUsage: null,
  contextWindow: undefined,
  mode: 'agent',
  activeSessionId: 'session-1',
  selectedSkillName: null,
  onSubmit: async () => {},
  onStop: () => {},
  onInputError: () => {},
  onOpenSettings: undefined,
  onSelectModel: () => {},
  onSelectThinkingLevel: () => {},
  onModeChange: () => {},
  onSelectSkillName: () => {},
  ...overrides,
});

describe('useSyncChatPaneFooterStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips store write when snapshot fields are unchanged', () => {
    const initial = createSnapshot();
    const equivalent = { ...initial };
    const changed = createSnapshot({ status: 'streaming' });

    const stateHook = renderHook(() => useChatPaneFooterStore((state) => state));
    const originalSetSnapshot = stateHook.result.current.setSnapshot;
    const setSnapshotSpy = vi.fn((next: ChatPaneFooterSnapshot) => {
      originalSetSnapshot(next);
    });
    stateHook.result.current.setSnapshot = setSnapshotSpy;

    const sync = renderHook(
      ({ snapshot }: { snapshot: ChatPaneFooterSnapshot }) => useSyncChatPaneFooterStore(snapshot),
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
    const statusHook = renderHook(() => useChatPaneFooterStore((state) => state.status));
    const modeHook = renderHook(() => useChatPaneFooterStore((state) => state.mode));
    const sync = renderHook(
      ({ snapshot }: { snapshot: ChatPaneFooterSnapshot }) => useSyncChatPaneFooterStore(snapshot),
      { initialProps: { snapshot: initial } }
    );

    expect(statusHook.result.current).toBe('ready');
    expect(modeHook.result.current).toBe('agent');

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
    statusHook.unmount();
    modeHook.unmount();
  });
});
