import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { useDocumentState } from './use-document-state';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useDocumentState', () => {
  const vault = { path: '/vault' };

  let readFile: ReturnType<typeof vi.fn>;
  let writeFile: ReturnType<typeof vi.fn>;
  let getOpenTabs: ReturnType<typeof vi.fn>;
  let getLastOpenedFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    readFile = vi.fn().mockResolvedValue({ content: 'Hello', mtime: 100 });
    writeFile = vi.fn().mockResolvedValue({ mtime: 200 });
    getOpenTabs = vi.fn().mockResolvedValue([]);
    getLastOpenedFile = vi.fn().mockResolvedValue(null);

    window.desktopAPI = {
      files: {
        read: readFile,
        write: writeFile,
      },
      workspace: {
        getOpenTabs,
        getLastOpenedFile,
        setOpenTabs: vi.fn(),
        setLastOpenedFile: vi.fn(),
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

    await waitFor(() => expect(writeFile).toHaveBeenCalled());
    await waitFor(() => expect(result.current.saveState).toBe('idle'));
  });

  it('filters persisted tabs outside vault and ignores invalid lastOpenedFile', async () => {
    getOpenTabs.mockResolvedValue([
      { id: 'ai', name: 'AI', path: '__ai__' },
      { id: 'outside', name: 'outside.md', path: '/vault2/outside.md' },
      { id: 'good', name: 'note.md', path: '/vault/note.md' },
      { id: 'dup', name: 'note.md', path: '/vault/note.md' },
    ]);
    getLastOpenedFile.mockResolvedValue('/vault2/outside.md');

    const { result } = renderHook(() => useDocumentState({ vault }));

    await waitFor(() =>
      expect(result.current.openTabs).toEqual([
        { id: 'good', name: 'note.md', path: '/vault/note.md' },
      ])
    );

    expect(readFile).not.toHaveBeenCalled();
    expect(result.current.selectedFile).toBeNull();
    expect(result.current.activeDoc).toBeNull();
  });
});
