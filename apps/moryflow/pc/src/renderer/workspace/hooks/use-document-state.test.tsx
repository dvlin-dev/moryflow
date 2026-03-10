import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { useDocumentState } from './use-document-state';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useDocumentState', () => {
  const vault = { path: '/vault' };
  type HookVault = { path: string } | null;

  const createDeferred = <T,>() => {
    let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  };

  let readFile: ReturnType<typeof vi.fn>;
  let writeFile: ReturnType<typeof vi.fn>;
  let getDocumentSession: ReturnType<typeof vi.fn>;
  let setDocumentSession: ReturnType<typeof vi.fn>;
  let getOpenTabs: ReturnType<typeof vi.fn>;
  let setOpenTabs: ReturnType<typeof vi.fn>;
  let getLastOpenedFile: ReturnType<typeof vi.fn>;
  let setLastOpenedFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    readFile = vi.fn().mockResolvedValue({ content: 'Hello', mtime: 100 });
    writeFile = vi.fn().mockResolvedValue({ mtime: 200 });
    getDocumentSession = vi.fn().mockResolvedValue({ tabs: [], activePath: null });
    setDocumentSession = vi.fn().mockResolvedValue(undefined);
    getOpenTabs = vi.fn().mockResolvedValue([]);
    setOpenTabs = vi.fn().mockResolvedValue(undefined);
    getLastOpenedFile = vi.fn().mockResolvedValue(null);
    setLastOpenedFile = vi.fn().mockResolvedValue(undefined);

    window.desktopAPI = {
      files: {
        read: readFile,
        write: writeFile,
      },
      workspace: {
        getDocumentSession,
        setDocumentSession,
        getOpenTabs,
        setOpenTabs,
        getLastOpenedFile,
        setLastOpenedFile,
        recordRecentFile: vi.fn(),
      },
      events: {},
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('auto-saves edited content after debounce', async () => {
    const { result } = renderHook(() => useDocumentState({ vault }));

    await act(async () => {
      await result.current.loadDocument({
        id: 'doc-1',
        name: 'note.md',
        path: '/vault/note.md',
      });
    });

    expect(readFile).toHaveBeenCalledWith('/vault/note.md');
    expect(window.desktopAPI.workspace.recordRecentFile).toHaveBeenCalledWith(
      '/vault',
      '/vault/note.md'
    );
    await waitFor(() => expect(result.current.activeDoc).not.toBeNull());

    act(() => {
      result.current.handleEditorChange('Updated content');
    });

    expect(result.current.saveState).toBe('dirty');
    expect(result.current.documentSurface).toBe('editor');

    await waitFor(() => expect(writeFile).toHaveBeenCalled());
    await waitFor(() => expect(result.current.saveState).toBe('idle'));
  });

  it('filters persisted tabs outside vault and falls back to the first valid tab', async () => {
    getDocumentSession.mockResolvedValue({
      tabs: [
        { id: 'ai', name: 'AI', path: '__ai__' },
        { id: 'outside', name: 'outside.md', path: '/vault2/outside.md' },
        { id: 'good', name: 'note.md', path: '/vault/note.md' },
        { id: 'dup', name: 'note.md', path: '/vault/note.md' },
      ],
      activePath: '/vault2/outside.md',
    });

    const { result } = renderHook(() => useDocumentState({ vault }));

    await waitFor(() =>
      expect(result.current.openTabs).toEqual([
        { id: 'good', name: 'note.md', path: '/vault/note.md' },
      ])
    );

    await waitFor(() => expect(readFile).toHaveBeenCalledWith('/vault/note.md'));
    await waitFor(() => expect(result.current.selectedFile?.path).toBe('/vault/note.md'));
    await waitFor(() => expect(result.current.activeDoc?.path).toBe('/vault/note.md'));
    expect(result.current.documentSurface).toBe('editor');
  });

  it('falls back to the next valid tab when the restored active tab cannot be read', async () => {
    getDocumentSession.mockResolvedValue({
      tabs: [
        { id: 'broken', name: 'broken.md', path: '/vault/broken.md' },
        { id: 'good', name: 'note.md', path: '/vault/note.md' },
      ],
      activePath: '/vault/broken.md',
    });
    readFile.mockImplementation(async (path: string) => {
      if (path === '/vault/broken.md') {
        throw new Error('ENOENT');
      }
      return { content: 'Recovered', mtime: 200 };
    });

    const { result } = renderHook(() => useDocumentState({ vault }));

    await waitFor(() =>
      expect(readFile.mock.calls.map(([path]) => path)).toEqual([
        '/vault/broken.md',
        '/vault/note.md',
      ])
    );
    await waitFor(() =>
      expect(result.current.openTabs).toEqual([
        { id: 'good', name: 'note.md', path: '/vault/note.md' },
      ])
    );
    await waitFor(() => expect(result.current.selectedFile?.path).toBe('/vault/note.md'));
    await waitFor(() => expect(result.current.activeDoc?.path).toBe('/vault/note.md'));
  });

  it('clears pending intents when vault changes', async () => {
    const { result, rerender } = renderHook(
      ({ currentVault }: { currentVault: HookVault }) => useDocumentState({ vault: currentVault }),
      {
        initialProps: {
          currentVault: { path: '/vault-a' } as HookVault,
        },
      }
    );

    act(() => {
      result.current.setPendingSelectionPath('/vault-a/docs/a.md');
      result.current.setPendingOpenPath('/vault-a/docs/a.md');
    });

    expect(result.current.pendingSelectionPath).toBe('/vault-a/docs/a.md');
    expect(result.current.pendingOpenPath).toBe('/vault-a/docs/a.md');

    rerender({ currentVault: { path: '/vault-b' } });

    await waitFor(() => {
      expect(result.current.pendingSelectionPath).toBeNull();
      expect(result.current.pendingOpenPath).toBeNull();
    });
  });

  it('resets document state when vault becomes unavailable', async () => {
    getDocumentSession.mockResolvedValue({
      tabs: [{ id: 'note', name: 'note.md', path: '/vault-a/note.md' }],
      activePath: '/vault-a/note.md',
    });

    const { result, rerender } = renderHook(
      ({ currentVault }: { currentVault: HookVault }) => useDocumentState({ vault: currentVault }),
      {
        initialProps: {
          currentVault: { path: '/vault-a' } as HookVault,
        },
      }
    );

    await waitFor(() => {
      expect(result.current.selectedFile?.path).toBe('/vault-a/note.md');
      expect(result.current.activeDoc?.path).toBe('/vault-a/note.md');
      expect(result.current.openTabs).toEqual([
        { id: 'note', name: 'note.md', path: '/vault-a/note.md' },
      ]);
    });

    rerender({ currentVault: null });

    await waitFor(() => {
      expect(result.current.selectedFile).toBeNull();
      expect(result.current.activeDoc).toBeNull();
      expect(result.current.openTabs).toEqual([]);
      expect(result.current.docState).toBe('idle');
      expect(result.current.documentSurface).toBe('empty');
    });
  });

  it('ignores stale restore result after vault is cleared', async () => {
    const sessionDeferred = createDeferred<{
      tabs: Array<{ id: string; name: string; path: string }>;
      activePath: string | null;
    }>();
    getDocumentSession.mockReturnValue(sessionDeferred.promise);

    const { result, rerender } = renderHook(
      ({ currentVault }: { currentVault: HookVault }) => useDocumentState({ vault: currentVault }),
      {
        initialProps: {
          currentVault: { path: '/vault-a' } as HookVault,
        },
      }
    );

    rerender({ currentVault: null });

    await act(async () => {
      sessionDeferred.resolve({
        tabs: [{ id: 'stale', name: 'stale.md', path: '/vault-a/stale.md' }],
        activePath: '/vault-a/stale.md',
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(readFile).not.toHaveBeenCalled();
    expect(result.current.selectedFile).toBeNull();
    expect(result.current.activeDoc).toBeNull();
    expect(result.current.openTabs).toEqual([]);
  });

  it('keeps the latest manual document load when earlier reads resolve later', async () => {
    const firstRead = createDeferred<{ content: string; mtime: number }>();
    const secondRead = createDeferred<{ content: string; mtime: number }>();
    readFile.mockImplementation((path: string) => {
      if (path === '/vault/first.md') {
        return firstRead.promise;
      }
      if (path === '/vault/second.md') {
        return secondRead.promise;
      }
      throw new Error(`unexpected read for ${path}`);
    });

    const { result } = renderHook(() => useDocumentState({ vault }));

    await act(async () => {
      void result.current.loadDocument({
        id: 'first',
        name: 'first.md',
        path: '/vault/first.md',
      });
      void result.current.loadDocument({
        id: 'second',
        name: 'second.md',
        path: '/vault/second.md',
      });
      await Promise.resolve();
    });

    expect(result.current.selectedFile?.path).toBe('/vault/second.md');

    await act(async () => {
      secondRead.resolve({ content: 'Second', mtime: 200 });
      await Promise.resolve();
    });

    expect(result.current.activeDoc?.path).toBe('/vault/second.md');
    expect(result.current.activeDoc?.content).toBe('Second');
    expect(window.desktopAPI.workspace.recordRecentFile).toHaveBeenCalledTimes(1);
    expect(window.desktopAPI.workspace.recordRecentFile).toHaveBeenLastCalledWith(
      '/vault',
      '/vault/second.md'
    );

    await act(async () => {
      firstRead.resolve({ content: 'First', mtime: 100 });
      await Promise.resolve();
    });

    expect(result.current.selectedFile?.path).toBe('/vault/second.md');
    expect(result.current.activeDoc?.path).toBe('/vault/second.md');
    expect(result.current.activeDoc?.content).toBe('Second');
    expect(window.desktopAPI.workspace.recordRecentFile).toHaveBeenCalledTimes(1);
  });

  it('flushes pending edits before switching to another document', async () => {
    const { result } = renderHook(() => useDocumentState({ vault }));

    await act(async () => {
      await result.current.loadDocument({
        id: 'doc-1',
        name: 'note.md',
        path: '/vault/note.md',
      });
    });

    act(() => {
      result.current.handleEditorChange('Updated content');
    });

    await act(async () => {
      await result.current.loadDocument({
        id: 'doc-2',
        name: 'other.md',
        path: '/vault/other.md',
      });
    });

    expect(writeFile).toHaveBeenCalledWith({
      path: '/vault/note.md',
      content: 'Updated content',
      clientMtime: 100,
    });
    expect(writeFile.mock.invocationCallOrder[0]).toBeLessThan(
      readFile.mock.invocationCallOrder[1]
    );
    expect(result.current.selectedFile?.path).toBe('/vault/other.md');
    expect(result.current.activeDoc?.path).toBe('/vault/other.md');
  });

  it('merges restored tabs without overriding a manual document opened during startup', async () => {
    const sessionDeferred = createDeferred<{
      tabs: Array<{ id: string; name: string; path: string }>;
      activePath: string | null;
    }>();
    getDocumentSession.mockReturnValue(sessionDeferred.promise);
    readFile.mockImplementation(async (path: string) => {
      if (path === '/vault/manual.md') {
        return { content: 'Manual', mtime: 300 };
      }
      throw new Error(`unexpected read for ${path}`);
    });

    const { result } = renderHook(() => useDocumentState({ vault }));

    await act(async () => {
      await result.current.loadDocument({
        id: 'manual',
        name: 'manual.md',
        path: '/vault/manual.md',
      });
    });

    await act(async () => {
      sessionDeferred.resolve({
        tabs: [
          { id: 'restored-a', name: 'restored-a.md', path: '/vault/restored-a.md' },
          { id: 'restored-b', name: 'restored-b.md', path: '/vault/restored-b.md' },
        ],
        activePath: '/vault/restored-a.md',
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.selectedFile?.path).toBe('/vault/manual.md');
    expect(result.current.activeDoc?.path).toBe('/vault/manual.md');
    expect(result.current.openTabs).toEqual([
      { id: 'manual', name: 'manual.md', path: '/vault/manual.md', pinned: false },
      { id: 'restored-a', name: 'restored-a.md', path: '/vault/restored-a.md' },
      { id: 'restored-b', name: 'restored-b.md', path: '/vault/restored-b.md' },
    ]);
    expect(result.current.documentSurface).toBe('editor');
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it('does not reopen a restored tab after the user closes it during startup restore', async () => {
    const restoreRead = createDeferred<{ content: string; mtime: number }>();
    getDocumentSession.mockResolvedValue({
      tabs: [{ id: 'restored', name: 'restored.md', path: '/vault/restored.md' }],
      activePath: '/vault/restored.md',
    });
    readFile.mockImplementation((path: string) => {
      if (path === '/vault/restored.md') {
        return restoreRead.promise;
      }
      throw new Error(`unexpected read for ${path}`);
    });

    const { result } = renderHook(() => useDocumentState({ vault }));

    await waitFor(() => expect(result.current.selectedFile?.path).toBe('/vault/restored.md'));

    act(() => {
      result.current.handleCloseTab('/vault/restored.md');
    });

    await act(async () => {
      restoreRead.resolve({ content: 'Restored', mtime: 500 });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.selectedFile).toBeNull();
    expect(result.current.activeDoc).toBeNull();
    expect(result.current.openTabs).toEqual([]);
    expect(result.current.documentSurface).toBe('empty');
  });

  it('reports empty surface when restored document session has no valid tabs', async () => {
    getDocumentSession.mockResolvedValue({
      tabs: [{ id: 'outside', name: 'outside.md', path: '/outside/outside.md' }],
      activePath: '/outside/outside.md',
    });

    const { result } = renderHook(() => useDocumentState({ vault }));

    await waitFor(() => expect(result.current.documentSurface).toBe('empty'));
    expect(result.current.openTabs).toEqual([]);
    expect(result.current.selectedFile).toBeNull();
    expect(result.current.activeDoc).toBeNull();
  });

  it('persists tabs and active path through document session', async () => {
    const { result } = renderHook(() => useDocumentState({ vault }));

    await act(async () => {
      await result.current.loadDocument({
        id: 'doc-1',
        name: 'note.md',
        path: '/vault/note.md',
      });
    });

    await waitFor(() =>
      expect(setDocumentSession).toHaveBeenCalledWith('/vault', {
        tabs: [{ id: 'doc-1', name: 'note.md', path: '/vault/note.md', pinned: false }],
        activePath: '/vault/note.md',
      })
    );
  });

  it('falls back to legacy workspace persistence when document session bridge is unavailable', async () => {
    getOpenTabs.mockResolvedValue([{ id: 'legacy', name: 'note.md', path: '/vault/note.md' }]);
    getLastOpenedFile.mockResolvedValue('/vault/note.md');

    window.desktopAPI = {
      files: {
        read: readFile,
        write: writeFile,
      },
      workspace: {
        getOpenTabs,
        setOpenTabs,
        getLastOpenedFile,
        setLastOpenedFile,
        recordRecentFile: vi.fn(),
      },
      events: {},
    } as unknown as DesktopApi;

    const { result } = renderHook(() => useDocumentState({ vault }));

    await waitFor(() => expect(getOpenTabs).toHaveBeenCalledWith('/vault'));
    await waitFor(() => expect(getLastOpenedFile).toHaveBeenCalledWith('/vault'));
    await waitFor(() => expect(readFile).toHaveBeenCalledWith('/vault/note.md'));
    await waitFor(() => expect(result.current.selectedFile?.path).toBe('/vault/note.md'));

    act(() => {
      result.current.handleEditorChange('Updated content');
    });

    await waitFor(() =>
      expect(setOpenTabs).toHaveBeenCalledWith('/vault', [
        { id: 'legacy', name: 'note.md', path: '/vault/note.md', pinned: true },
      ])
    );
    await waitFor(() => expect(setLastOpenedFile).toHaveBeenCalledWith('/vault', '/vault/note.md'));
  });
});
