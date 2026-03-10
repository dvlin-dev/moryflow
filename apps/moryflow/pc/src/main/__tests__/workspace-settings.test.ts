import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildRecentFilesList } from '../workspace-settings.utils';

type SidebarMode = 'chat' | 'home';

describe('buildRecentFilesList', () => {
  const storeState: { lastSidebarMode: SidebarMode | undefined } = {
    lastSidebarMode: undefined,
  };

  const importWorkspaceSettings = async () => {
    vi.resetModules();

    const getMock = vi.fn((key: string) =>
      key === 'lastSidebarMode' ? storeState.lastSidebarMode : undefined
    );
    const setMock = vi.fn((key: string, value: unknown) => {
      if (key === 'lastSidebarMode') {
        storeState.lastSidebarMode = value as SidebarMode;
      }
    });

    vi.doMock('electron-store', () => {
      class MockStore {
        constructor(input?: { defaults?: Record<string, unknown> }) {
          const defaultMode = input?.defaults?.lastSidebarMode;
          if (
            storeState.lastSidebarMode === undefined &&
            (defaultMode === 'chat' || defaultMode === 'home')
          ) {
            storeState.lastSidebarMode = defaultMode;
          }
        }

        get = getMock;
        set = setMock;
      }

      return {
        default: MockStore,
      };
    });

    const mod = await import('../workspace-settings');
    return { ...mod, getMock, setMock };
  };

  beforeEach(() => {
    storeState.lastSidebarMode = 'home';
  });

  afterEach(() => {
    vi.doUnmock('electron-store');
    vi.resetModules();
  });

  it('keeps most recent file at the front and removes duplicates', () => {
    const next = buildRecentFilesList(['/a.md', '/b.md', '/c.md'], '/b.md');
    expect(next).toEqual(['/b.md', '/a.md', '/c.md']);
  });

  it('caps the list to three items', () => {
    const next = buildRecentFilesList(['/a.md', '/b.md', '/c.md'], '/d.md');
    expect(next).toEqual(['/d.md', '/a.md', '/b.md']);
  });

  it('defaults sidebar mode to home', async () => {
    storeState.lastSidebarMode = undefined;
    const { getLastSidebarMode } = await importWorkspaceSettings();

    expect(getLastSidebarMode()).toBe('home');
  });

  it('persists explicit sidebar mode updates', async () => {
    const { getLastSidebarMode, setLastSidebarMode, setMock } = await importWorkspaceSettings();

    setLastSidebarMode('chat');

    expect(getLastSidebarMode()).toBe('chat');
    expect(setMock).toHaveBeenCalledWith('lastSidebarMode', 'chat');
  });
});
